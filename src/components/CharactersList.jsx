const CharacterList = ({ char }) => {
  return (
    <div className="grid grid-cols-3 gap-4 p-8">
      <div
        key={char.id}
        className="p-4 border rounded bg-white shadow text-center"
      >
        <img
          src={char.img}
          alt={char.name}
          className="w-20 h-20 object-cover mx-auto"
        />
        <h3 className="text-lg font-bold mt-2">{char.name}</h3>
        <p className="text-sm mt-1">{char.description}</p>
      </div>
    </div>
  );
};

export default CharacterList;
