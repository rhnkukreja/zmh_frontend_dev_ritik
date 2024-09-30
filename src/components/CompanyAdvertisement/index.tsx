const CompanyAdvertisement = () => {
  return (
    <div className=" text-white">
      <h1 className="text-3xl font-bold mb-4">Investor Engagement Dashboard</h1>
      <p className="italic mb-4">
        “ZMH’s Engagement Dashboard offers everything you need to{" "}
        <span className="font-semibold">prepare for investor engagements.</span>
      </p>
      <p className="italic mb-4">
        Most importantly, it significantly{" "}
        <span className="font-semibold">reduces the time and effort</span>{" "}
        required to gather information for the executive team. And ensures that
        the executive team is well prepared for investor engagement.”
      </p>
      <p className="font-bold">
        Virginia “Ginny” Fogg, Former General Counsel, Norfolk Southern (NYSE:
        NSC)
      </p>

      <div className="mt-8">
        <iframe
          className="w-full lg:w-[90%] xl:w-[90%] 2xl:w-[80%] thumbnail-section"
          src="https://www.youtube.com/embed/JorKwO75Vx8"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default CompanyAdvertisement;
