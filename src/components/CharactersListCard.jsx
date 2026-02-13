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
        className="mafia-role-card w-full h-full p-4 text-center flex flex-col gap-3"
        id="card-bg-imgs"
      >
        <img
          src={`/${character.img}`}
          alt={character.name}
          className="w-15 h-15 object-contain mx-auto"
        />
        <h3 className="text-2xl font-black mt-1">{character.name}</h3>
        <p className="text-md font-bold mt-auto">
          <i>{character.description}</i>
        </p>
      </div>
    </div>
  );
};

export default CharacterListCard;
