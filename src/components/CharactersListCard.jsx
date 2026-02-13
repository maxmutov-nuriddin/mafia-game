const CharacterListCard = ({ character, onDelete }) => {
  if (!character) {
    return (
      <div className="w-full h-full p-2" onClick={onDelete}>
        <div
          className="mafia-role-card w-full h-full p-4 text-center flex flex-col gap-3"
          id="card-bg-imgs"
        >
          <h3 className="text-2xl font-black mt-1">Ожидание...</h3>
          <p className="text-md font-bold mt-auto">
            <i>Персонаж еще не назначен</i>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onDelete} className="w-full h-full p-2">
      <div
        key={character.id}
        className="mafia-role-card w-full h-full p-3 flex flex-col"
        id="card-bg-imgs"
      >
        <div className="flex-1 min-h-0 p-2 flex items-center justify-center">
          <img
            src={`/${character.img}`}
            alt={character.name}
            className="max-w-full max-h-full w-auto h-auto object-contain object-center"
          />
        </div>
        <div className="mt-3 rounded-lg border border-[#250506]/20 bg-[#f4ede1]/85 px-3 py-2 text-center">
          <h3 className="text-2xl font-black leading-tight">{character.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default CharacterListCard;
