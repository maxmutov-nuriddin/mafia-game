import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useLanguage } from "../../i18n/LanguageContext";
import { getAbilities, getRoleId, isMafiaRole } from "../../game/abilities";
import { SKIP_VOTE } from "../../game/dayEngine";
import { calculatePlayerReward } from "../../game/economy";
import { claimGamePoints } from "../../services/profileService";
import { PHASE, roundKey } from "../../game/phases";
import { formatClock, useRoomGame, useSecondsLeft } from "../../game/useRoomGame";
import {
  listenToRoomPlayers,
  submitNightAction,
  submitVote,
} from "../../services/gameService";
import TargetList from "./TargetList";
import { announceAward } from "./announceAward";

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const describeResult = (result, nameOf, t) => {
  switch (result.key) {
    case "blocked":
      return t("result.blocked");
    case "check":
      return t(result.isMafia ? "result.checkMafia" : "result.checkClean", {
        name: nameOf(result.targetId),
      });
    case "donCheck":
      return t(result.isCommissioner ? "result.donYes" : "result.donNo", {
        name: nameOf(result.targetId),
      });
    case "watch":
      return result.visitedId
        ? t("result.watchVisited", { name: nameOf(result.targetId), target: nameOf(result.visitedId) })
        : t("result.watchNothing", { name: nameOf(result.targetId) });
    case "lovers":
      return t("result.lovers", { name: nameOf(result.targetId) });
    default:
      return "";
  }
};

const Notice = ({ children }) => (
  <p className="mafia-panel bg-white/90 p-3 text-sm font-semibold leading-snug">{children}</p>
);

/**
 * Night actions, discussion timer and day vote on a player's phone.
 * @param {{roomId: string|null, player: {id: string, eliminated?: boolean, character?: object}, settings: object}} props
 */
const PlayerGamePanel = ({ roomId, player, settings }) => {
  const { t } = useLanguage();
  const { isLoaded, state, actions, votes, results } = useRoomGame(roomId);
  const [players, setPlayers] = useState([]);
  const [pendingLink, setPendingLink] = useState([]);

  useEffect(() => {
    if (!roomId) return undefined;
    return listenToRoomPlayers(roomId, setPlayers);
  }, [roomId]);

  const secondsLeft = useSecondsLeft(state?.phase === PHASE.DISCUSSION ? state.endsAt : null);

  // Registered players claim their own points once the game has a winner (idempotent per room).
  useEffect(() => {
    if (!roomId || state?.phase !== PHASE.ENDED || !state.winner) return;
    const self = players.find((other) => other.id === player.id);
    if (!self?.uid || !self.character) return;

    const reward = calculatePlayerReward({
      player: self,
      winner: state.winner,
      playerCount: players.length,
    });
    claimGamePoints({ awardKey: roomId, basePoints: reward.basePoints, won: reward.won, kind: "player" })
      .then((outcome) => announceAward(outcome, t))
      .catch((error) => console.error("Claim points error:", error));
  }, [roomId, state?.phase, state?.winner, players, player.id, t]);

  const me = useMemo(
    () => ({ ...player, ...players.find((other) => other.id === player.id) }),
    [player, players]
  );
  const alivePlayers = useMemo(() => players.filter((other) => !other.eliminated), [players]);

  const nameOf = (id) => players.find((other) => other.id === id)?.name || "?";
  const toTargets = (list) => list.map((other) => ({ id: other.id, name: other.name }));

  if (!settings.actions && !settings.discussion) return null;
  if (!isLoaded || !state || me.eliminated || !me.character) return null;

  const rk = roundKey(state.round);
  const myAction = actions[rk]?.[me.id] || {};

  const saveAction = async (nextAction) => {
    try {
      await submitNightAction(roomId, state.round, me.id, nextAction);
    } catch (error) {
      console.error(error);
      toast.error(t("player.saveError"));
    }
  };

  const chooseTarget = async (abilityDef, targetId) => {
    if (abilityDef.picks === 1) {
      await saveAction({ ...myAction, [abilityDef.key]: targetId });
      return;
    }

    const next = pendingLink.includes(targetId)
      ? pendingLink.filter((id) => id !== targetId)
      : [...pendingLink, targetId].slice(-abilityDef.picks);
    setPendingLink(next);
    if (next.length === abilityDef.picks) {
      await saveAction({ ...myAction, [abilityDef.key]: next });
    }
  };

  const castVote = async (targetId) => {
    try {
      await submitVote(roomId, state.round, me.id, targetId);
    } catch (error) {
      console.error(error);
      toast.error(t("player.saveError"));
    }
  };

  const renderNight = () => {
    const abilities = getAbilities(me, { players, state, round: state.round });
    const teammates = isMafiaRole(getRoleId(me))
      ? alivePlayers.filter((other) => other.id !== me.id && isMafiaRole(getRoleId(other)))
      : [];

    return (
      <>
        {state.lastVote && <Notice>{describeVote(state.lastVote)}</Notice>}
        {teammates.length > 0 && (
          <Notice>{t("player.teammates", { names: teammates.map((mate) => mate.name).join(", ") })}</Notice>
        )}
        {abilities.length === 0 && <Notice>{t("player.sleep")}</Notice>}
        {abilities.map((abilityDef) => {
          const candidates = alivePlayers.filter(
            (other) =>
              (abilityDef.allowSelf || other.id !== me.id) &&
              !(abilityDef.key === "kill" && isMafiaRole(getRoleId(other)))
          );
          const saved = toList(myAction[abilityDef.key]);
          const selectedIds = abilityDef.picks > 1 && saved.length < abilityDef.picks ? pendingLink : saved;
          const title =
            abilityDef.picks > 1
              ? `${t(`ability.${abilityDef.key}`)} — ${t("player.pickTwo", { count: selectedIds.length })}`
              : t(`ability.${abilityDef.key}`);

          return (
            <TargetList
              key={abilityDef.key}
              title={title}
              targets={toTargets(candidates)}
              selectedIds={selectedIds}
              onPick={(targetId) => chooseTarget(abilityDef, targetId)}
            />
          );
        })}
      </>
    );
  };

  const describeVote = (lastVote) =>
    lastVote.deaths.length > 0
      ? t("flow.voteEliminated", { names: lastVote.deaths.map(nameOf).join(", ") })
      : t("flow.voteNobody");

  const renderMorning = () => {
    const myResult = results[rk]?.[me.id];
    const deaths = state.morning?.deaths || [];

    return (
      <>
        <Notice>
          {deaths.length > 0
            ? t("flow.died", { names: deaths.map(nameOf).join(", ") })
            : t("flow.nobodyDied")}
        </Notice>
        {state.silencedId && <Notice>{t("flow.silenced", { name: nameOf(state.silencedId) })}</Notice>}
        {myResult && <Notice>{describeResult(myResult, nameOf, t)}</Notice>}
        <p className="text-xs font-semibold opacity-70">{t("player.waitHost")}</p>
      </>
    );
  };

  const renderDiscussion = () => (
    <>
      <p className="text-sm font-black">{t("player.discussionTitle")}</p>
      <p className="text-center text-4xl font-black">{formatClock(secondsLeft)}</p>
      {state.silencedId === me.id && <Notice>{t("player.silent")}</Notice>}
    </>
  );

  const renderVoting = () => {
    const myVote = votes[rk]?.[me.id];
    const skipButton = (
      <button
        type="button"
        onClick={() => castVote(SKIP_VOTE)}
        aria-pressed={myVote === SKIP_VOTE}
        className={`mafia-btn mafia-btn--sm w-full justify-start ${
          myVote === SKIP_VOTE ? "mafia-btn--primary" : ""
        }`}
      >
        {t("player.voteSkip")}
      </button>
    );

    return (
      <TargetList
        title={t("player.voteTitle")}
        targets={toTargets(alivePlayers.filter((other) => other.id !== me.id))}
        selectedIds={myVote ? [myVote] : []}
        onPick={castVote}
        extra={skipButton}
      />
    );
  };

  const phaseBody = {
    [PHASE.NIGHT]: renderNight,
    [PHASE.MORNING]: renderMorning,
    [PHASE.DISCUSSION]: renderDiscussion,
    [PHASE.VOTING]: renderVoting,
    [PHASE.ENDED]: () => <Notice>{t(`flow.winner.${state.winner}`)}</Notice>,
    [PHASE.IDLE]: () => <Notice>{t("player.waitHost")}</Notice>,
  }[state.phase];

  return (
    <div className="flex w-full flex-col gap-2 text-left">
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {t(`flow.phase.${state.phase}`)}
        {settings.actions && state.phase !== PHASE.ENDED ? ` · ${t("flow.round", { n: state.round })}` : ""}
      </p>
      {phaseBody ? phaseBody() : null}
    </div>
  );
};

export default PlayerGamePanel;
