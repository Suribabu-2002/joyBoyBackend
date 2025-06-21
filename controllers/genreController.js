import Movie from "../models/movieModel.js";

export const getGenres = async (req, res) => {
  try {
    // Get all distinct genres from the Movie collection
    // Aggregate to get genre names and their document counts, then sort and limit to top 5
    const topGenres = await Movie.aggregate([
      { $unwind: "$genres" },
      { $group: { _id: "$genres.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const genres = topGenres.map((g) => ({ name: g._id, count: g.count }));

    res.status(200).json({
      genres,
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    res
      .status(500)
      .json({ message: "Error retrieving genres", error: error.message });
  }
};
