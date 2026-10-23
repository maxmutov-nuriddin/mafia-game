/**
 * Tappable list of players to pick from.
 * @param {{
 *   title: string,
 *   targets: {id: string, name: string}[],
 *   selectedIds: string[],
 *   onPick: (id: string) => void,
 *   extra?: import("react").ReactNode,
 * }} props
 */
const TargetList = ({ title, targets, selectedIds, onPick, extra = null }) => (
  <div className="flex flex-col gap-2">
    <p className="text-sm font-black">{title}</p>
    <div className="flex flex-col gap-1.5">
      {targets.map((target) => {
        const isSelected = selectedIds.includes(target.id);
        return (
          <button
            key={target.id}
            type="button"
            onClick={() => onPick(target.id)}
            aria-pressed={isSelected}
            className={`mafia-btn mafia-btn--sm w-full justify-start truncate ${
              isSelected ? "mafia-btn--primary" : ""
            }`}
          >
            {target.name}
          </button>
        );
      })}
      {extra}
    </div>
  </div>
);

export default TargetList;
