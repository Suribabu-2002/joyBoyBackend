import getPagination from "../utils/getPagination.js";
import { db } from "../app.js";

const getActors = async (req, res) => {
  try {
    if (!db) throw new Error("DB connection failed");
    const { page, limit, skip } = getPagination(req);
    let filter = "";
    let params = [];

    if (req.query.name) {
      filter = "WHERE f.title LIKE ?";
      params.push(`%${req.query.title}%`);
    }

    const countQuery = `SELECT COUNT(DISTINCT f.film_id) AS total
FROM film f
JOIN film_actor fa ON f.film_id = fa.film_id
JOIN actor a ON fa.actor_id = a.actor_id ${filter}`;
    const [countRows] = await db.promise().query(countQuery, params);
    const total_actors = countRows[0].total;

    const query = `
    SELECT f.film_id, f.title, f.description, f.rating,
       JSON_ARRAYAGG(JSON_OBJECT('actor_id', a.actor_id, 'name', CONCAT(a.first_name, ' ', a.last_name))) AS actors
FROM film f
JOIN film_actor fa ON f.film_id = fa.film_id
JOIN actor a ON fa.actor_id = a.actor_id
${filter}
GROUP BY f.film_id, f.title, f.description, f.rating
ORDER BY f.film_id LIMIT ? OFFSET ?;
`;
    const finalParams = [...params, limit, skip];
    const [rows] = await db.promise().query(query, finalParams);

    res.status(200).json({
      total_actors,
      page,
      limit,
      total_pages: Math.ceil(total_actors / limit),
      actors: rows,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Database query failed", details: err.message });
  }
};

export { getActors };
