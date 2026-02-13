const CharacterList = ({ character }) => {
  return (
    <div className="w-full flex justify-center p-2 sm:p-3">
      <div
        key={character.id}
        className="mafia-role-card w-full max-w-[230px] md:max-w-[245px] p-2.5 flex flex-col"
        id="card-bg-img"
      >
        <div className="h-[220px] md:h-[235px] p-2 flex-shrink-0 flex items-center justify-center">
          <img
            src={character.img}
            alt={character.name}
            className="max-w-full max-h-full w-auto h-auto object-contain object-center"
          />
        </div>

        <div className="mt-2 rounded-lg border border-[#250506]/20 bg-[#f4ede1]/85 px-3 py-2 text-center">
          <h3 className="text-xl font-black leading-tight">{character.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default CharacterList;
