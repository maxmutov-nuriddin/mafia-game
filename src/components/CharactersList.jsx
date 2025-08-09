const CharacterList = ({ character }) => {
  
  return (
    <div className="grid grid-cols-1 gap-4 p-8">
      <div
        key={character.id}
        className="p-4 border rounded shadow text-center flex flex-col gap-2" id="card-bg-img"
      >
        <img
          src={character.img}
          alt={character.name}
          className="w-15 h-15 object-cover mx-auto"
        />
        <h3 className="text-2xl font-black mt-1">{character.name}</h3>
        <p className="text-md font-bold"><i>{character.description}</i></p>
      </div>
    </div>
  );
};

export default CharacterList;
