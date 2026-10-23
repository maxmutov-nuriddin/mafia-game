import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLanguage } from "../../i18n/LanguageContext";
import { getAbilities } from "../../game/abilities";
import { calculateHostReward } from "../../game/economy";
import { checkWinner, expandDeaths, resolveVote } from "../../game/dayEngine";
import { resolveNight } from "../../game/nightEngine";
import {
  PHASE,
  createInitialGameState,
  getNextPhase,
  getPhaseEndsAt,
  roundKey,
} from "../../game/phases";
import { formatClock, useRoomGame, useSecondsLeft } from "../../game/useRoomGame";
import {
  eliminatePlayer,
  initGame,
  saveNightResults,
  updateGameState,
} from "../../services/gameService";
import { getRegisteredUid } from "../../services/authService";
import { claimGamePoints } from "../../services/profileService";
import { announceAward } from "./announceAward";

const hasRoles = (players) => players.length > 0 && players.every((player) => player.character);

/**
 * Host controls: runs the night, morning, discussion and voting phases.
 * @param {{roomId: string|null, settings: object, players: object[]}} props
 */
const HostGamePanel = ({ roomId, settings, players }) => {
  const { t } = useLanguage();
  const { isLoaded, state, actions, votes } = useRoomGame(roomId);
  const [isBusy, setIsBusy] = useState(false);

  const isFlowEnabled = settings.actions || settings.discussion;
  const secondsLeft = useSecondsLeft(state?.phase === PHASE.DISCUSSION ? state.endsAt : null);

  useEffect(() => {
    if (!roomId || !isFlowEnabled || !isLoaded || state) return;
    initGame(roomId, createInitialGameState(settings)).catch((error) => {
      console.error("Game init error:", error);
      toast.error(t("flow.error"));
    });
    // t is stable per language and only used for the error toast
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isFlowEnabled, isLoaded, state, settings]);

  // A registered host earns a hosting reward once the game has a winner (idempotent per room).
  const hasWinner = state?.phase === PHASE.ENDED && !!state.winner;
  const playerCount = players.length;
  useEffect(() => {
    if (!roomId || !hasWinner || !getRegisteredUid()) return;

    const reward = calculateHostReward(playerCount);
    claimGamePoints({
      awardKey: `${roomId}:host`,
      basePoints: reward.basePoints,
      won: false,
      kind: "host",
    })
      .then((outcome) => announceAward(outcome, t))
      .catch((error) => console.error("Claim host points error:", error));
  }, [roomId, hasWinner, playerCount, t]);

  if (!isFlowEnabled || !state || !hasRoles(players)) return null;

  const alivePlayers = players.filter((player) => !player.eliminated);
  const nameOf = (id) => players.find((player) => player.id === id)?.name || "?";
  const rk = roundKey(state.round);
  const roundActions = actions[rk] || {};
  const roundVotes = votes[rk] || {};

  const eliminateAll = (ids) => Promise.all(ids.map((id) => eliminatePlayer(roomId, id)));

  const withEliminated = (ids) =>
    players.map((player) => (ids.includes(player.id) ? { ...player, eliminated: true } : player));

  const finishNight = async () => {
    const outcome = resolveNight({ players, actions: roundActions, state, round: state.round });
    const winner = checkWinner(withEliminated(outcome.deaths));

    await eliminateAll(outcome.deaths);
    await saveNightResults(roomId, state.round, outcome.privateResults);
    await updateGameState(roomId, {
      lovers: outcome.nextState.lovers,
      sniperUsed: outcome.nextState.sniperUsed,
      immortalUsed: outcome.nextState.immortalUsed,
      protectedId: outcome.nextState.protectedId,
      silencedId: outcome.silencedId,
      morning: { deaths: outcome.deaths },
      winner,
      phase: getNextPhase(PHASE.NIGHT, settings, !!winner),
      endsAt: null,
    });
  };

  const finishVoting = async () => {
    const { eliminatedId } = resolveVote({ players, votes: roundVotes, state });
    const deaths = eliminatedId ? expandDeaths([eliminatedId], state.lovers, players) : [];
    const winner = checkWinner(withEliminated(deaths));

    await eliminateAll(deaths);
    await updateGameState(roomId, {
      lastVote: { deaths },
      protectedId: null,
      silencedId: null,
      winner,
      phase: getNextPhase(PHASE.VOTING, settings, !!winner),
      round: winner ? state.round : state.round + 1,
      endsAt: null,
    });
  };

  const moveToNextPhase = async () => {
    const phase = getNextPhase(state.phase, settings);
    await updateGameState(roomId, { phase, endsAt: getPhaseEndsAt(phase, settings) });
  };

  const handleAdvance = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (state.phase === PHASE.NIGHT) await finishNight();
      else if (state.phase === PHASE.VOTING) await finishVoting();
      else await moveToNextPhase();
    } catch (error) {
      console.error("Phase change error:", error);
      toast.error(t("flow.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const actingPlayers = alivePlayers.filter(
    (player) => getAbilities(player, { players, state, round: state.round }).length > 0
  );
  const actedCount = actingPlayers.filter((player) => roundActions[player.id]).length;
  const votedCount = alivePlayers.filter((player) => roundVotes[player.id]).length;

  const advanceLabel = {
    [PHASE.NIGHT]: t("flow.finishNight"),
    [PHASE.VOTING]: t("flow.finishVoting"),
    [PHASE.DISCUSSION]: t("flow.endDiscussion"),
    [PHASE.IDLE]: t("flow.startDiscussion"),
    [PHASE.MORNING]: t("flow.next"),
  }[state.phase];

  const renderDetails = () => {
    switch (state.phase) {
      case PHASE.NIGHT:
        return (
          <>
            {state.lastVote && (
              <p className="text-sm font-semibold">
                {state.lastVote.deaths.length > 0
                  ? t("flow.voteEliminated", { names: state.lastVote.deaths.map(nameOf).join(", ") })
                  : t("flow.voteNobody")}
              </p>
            )}
            <p className="text-sm font-semibold">
              {t("flow.acted", { done: actedCount, total: actingPlayers.length })}
            </p>
          </>
        );
      case PHASE.MORNING:
        return (
          <>
            <p className="text-sm font-semibold">
              {state.morning?.deaths.length > 0
                ? t("flow.died", { names: state.morning.deaths.map(nameOf).join(", ") })
                : t("flow.nobodyDied")}
            </p>
            {state.silencedId && (
              <p className="text-sm font-semibold">
                {t("flow.silenced", { name: nameOf(state.silencedId) })}
              </p>
            )}
          </>
        );
      case PHASE.DISCUSSION:
        return <p className="text-3xl font-black">{formatClock(secondsLeft)}</p>;
      case PHASE.VOTING:
        return (
          <p className="text-sm font-semibold">
            {t("flow.voted", { done: votedCount, total: alivePlayers.length })}
          </p>
        );
      case PHASE.ENDED:
        return <p className="text-xl font-black">{t(`flow.winner.${state.winner}`)}</p>;
      default:
        return null;
    }
  };

  return (
    <div className="mafia-shell mx-5 mt-4 flex flex-col gap-2 rounded-3xl p-4 text-[#250506] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-black uppercase tracking-wide opacity-70">
          {t(`flow.phase.${state.phase}`)}
          {settings.actions && state.phase !== PHASE.ENDED
            ? ` · ${t("flow.round", { n: state.round })}`
            : ""}
        </p>
        {renderDetails()}
      </div>

      {advanceLabel && (
        <div className="sm:w-60">
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isBusy}
            className="mafia-btn mafia-btn--primary"
          >
            {advanceLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default HostGamePanel;
