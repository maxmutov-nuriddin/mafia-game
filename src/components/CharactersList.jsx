const CharacterList = ({ character }) => {
  
  return (
    <div className="grid grid-cols-1 gap-4 p-2 sm:p-8">
      <div
        key={character.id}
        className="mafia-panel p-4 text-center flex flex-col gap-2"
        id="card-bg-img"
      >
        <img
          src={character.img}
          alt={character.name}
          className="w-15//0 h-15 object-cover mx-auto"
        />
        <h3 className="text-2xl font-black mt-1">{character.name}</h3>
        <p className="text-md font-bold"><i>{character.description}</i></p>
      </div>
    </div>
  );
};

export default CharacterList;
