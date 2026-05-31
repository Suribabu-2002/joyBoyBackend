import { configDotenv } from "dotenv";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Movie from "../models/movieModel.js";

configDotenv();

const PAGE_SIZE = 20;
const MAX_API_CALLS = 5;
const LOCK_FILE_PATH = path.resolve(".scheduler", "movies-sync.lock");
const JOB_NAME = "movies-sync";
const STREAMING_AVAILABILITY_URL =
  "https://streaming-availability.p.rapidapi.com/shows/search/filters";

const REQUIRED_ENV_VARS = ["RAPIDAPI_KEY", "MONGO_URI"];

const buildRequestUrl = (cursor) => {
  const url = new URL(STREAMING_AVAILABILITY_URL);

  url.searchParams.set("country", "us");
  url.searchParams.set("show_type", "movie");
  url.searchParams.set("show_original_language", "en");
  url.searchParams.set("year_min", "2020");
  url.searchParams.set("order_by", "rating");
  url.searchParams.set("order_direction", "desc");
  url.searchParams.set("limit", String(PAGE_SIZE));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  return url;
};

const ensureEnvironment = () => {
  const missingEnvVars = REQUIRED_ENV_VARS.filter(
    (envVar) => !process.env[envVar]?.trim(),
  );

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required env vars: ${missingEnvVars.join(", ")}`);
  }
};

const acquireLock = async () => {
  await fs.mkdir(path.dirname(LOCK_FILE_PATH), { recursive: true });

  let lockHandle;

  try {
    lockHandle = await fs.open(LOCK_FILE_PATH, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(
        "Movie sync job is already running or the previous lock was not released.",
      );
    }

    throw error;
  }

  try {
    await lockHandle.writeFile(
      JSON.stringify(
        {
          job: JOB_NAME,
          pid: process.pid,
          startedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await lockHandle.close();
  }
};

const releaseLock = async () => {
  try {
    await fs.unlink(LOCK_FILE_PATH);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to release scheduler lock:", error.message);
    }
  }
};

const fetchShowsPage = async (cursor) => {
try {
    const response = await fetch(buildRequestUrl(cursor), {
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "streaming-availability.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Streaming Availability request failed with ${response.status}: ${errorText}`,
      );
    }

    return response.json();
} catch (error) {
  console.log(error?.message)
}
};

const normalizeImageSet = (imageSet = {}) => ({
  w240: imageSet.w240 ?? "",
  w360: imageSet.w360 ?? "",
  w480: imageSet.w480 ?? "",
  w600: imageSet.w600 ?? "",
  w720: imageSet.w720 ?? "",
  w1080: imageSet.w1080 ?? "",
  w1440: imageSet.w1440 ?? "",
});

const normalizeGenres = (genres = []) =>
  genres
    .filter((genre) => genre?.id && genre?.name)
    .map((genre) => ({
      id: String(genre.id).trim(),
      name: String(genre.name).trim(),
    }));

const normalizeAudios = (audios = []) =>
  audios
    .filter((audio) => audio?.language)
    .map((audio) => ({
      language: String(audio.language).trim(),
    }));

const normalizeSubtitles = (subtitles = []) =>
  subtitles
    .filter((subtitle) => subtitle?.locale?.language)
    .map((subtitle) => ({
      closedCaptions: Boolean(subtitle.closedCaptions),
      locale: {
        language: String(subtitle.locale.language).trim(),
      },
    }));

const normalizeService = (service) => {
  if (
    !service?.id ||
    !service?.name ||
    !service?.homePage ||
    !service?.themeColorCode ||
    !service?.imageSet?.lightThemeImage ||
    !service?.imageSet?.darkThemeImage ||
    !service?.imageSet?.whiteImage
  ) {
    return null;
  }

  return {
    id: String(service.id).trim(),
    name: String(service.name).trim(),
    homePage: String(service.homePage).trim(),
    themeColorCode: String(service.themeColorCode).trim(),
    imageSet: {
      lightThemeImage: String(service.imageSet.lightThemeImage).trim(),
      darkThemeImage: String(service.imageSet.darkThemeImage).trim(),
      whiteImage: String(service.imageSet.whiteImage).trim(),
    },
  };
};

const normalizeStreamingOptions = (streamingOptions = {}) => {
  const normalizedEntries = Object.entries(streamingOptions).map(
    ([countryCode, options]) => {
      const normalizedOptions = (options ?? [])
        .map((option) => {
          const service = normalizeService(option?.service);

          if (
            !service ||
            !option?.type ||
            !option?.link ||
            typeof option.availableSince !== "number"
          ) {
            return null;
          }

          const normalizedOption = {
            service,
            type: option.type,
            link: String(option.link).trim(),
            expiresSoon: Boolean(option.expiresSoon),
            availableSince: option.availableSince,
            audios: normalizeAudios(option.audios),
            subtitles: normalizeSubtitles(option.subtitles),
          };

          if (option.videoLink) {
            normalizedOption.videoLink = String(option.videoLink).trim();
          }

          if (option.quality) {
            normalizedOption.quality = String(option.quality).trim();
          }

          if (option.addon) {
            const addon = normalizeService(option.addon);
            if (addon) {
              normalizedOption.addon = addon;
            }
          }

          return normalizedOption;
        })
        .filter(Boolean);

      return [countryCode, normalizedOptions];
    },
  );

  return Object.fromEntries(
    normalizedEntries.filter(([, options]) => options.length > 0),
  );
};

const mapShowToMovieDocument = (show) => {
  if (
    !show?.id ||
    !show?.title ||
    !show?.imageSet?.verticalPoster ||
    !show?.imageSet?.horizontalPoster ||
    !show?.imageSet?.horizontalBackdrop
  ) {
    return null;
  }

  return {
    itemType: "show",
    showType: show.showType === "tv_series" ? "tv_series" : "movie",
    id: String(show.id).trim(),
    imdbId: show.imdbId ? String(show.imdbId).trim() : undefined,
    tmdbId: show.tmdbId ? String(show.tmdbId).trim() : undefined,
    title: String(show.title).trim(),
    overview: show.overview ? String(show.overview).trim() : undefined,
    releaseYear:
      typeof show.releaseYear === "number" ? show.releaseYear : undefined,
    originalTitle: show.originalTitle
      ? String(show.originalTitle).trim()
      : undefined,
    genres: normalizeGenres(show.genres),
    directors: (show.directors ?? [])
      .filter(Boolean)
      .map((director) => String(director).trim()),
    cast: (show.cast ?? [])
      .filter(Boolean)
      .map((castMember) => String(castMember).trim()),
    rating: typeof show.rating === "number" ? show.rating : undefined,
    runtime: typeof show.runtime === "number" ? show.runtime : undefined,
    imageSet: {
      verticalPoster: normalizeImageSet(show.imageSet.verticalPoster),
      horizontalPoster: normalizeImageSet(show.imageSet.horizontalPoster),
      horizontalBackdrop: normalizeImageSet(show.imageSet.horizontalBackdrop),
    },
    streamingOptions: normalizeStreamingOptions(show.streamingOptions),
  };
};

const collectMoviesPayload = async () => {
  const allMovies = [];
  let nextCursor;
  let hasMore = true;
  let totalCalls = 0;

  while (totalCalls < MAX_API_CALLS && hasMore !== false) {
    const page = await fetchShowsPage(nextCursor);
    const shows = Array.isArray(page?.shows) ? page.shows : [];

    totalCalls += 1;

    const preparedMovies = shows.map(mapShowToMovieDocument).filter(Boolean);
    allMovies.push(...preparedMovies);

    console.log(
      `Call ${totalCalls}: received ${shows.length} shows, prepared ${preparedMovies.length} movies.`,
    );

    nextCursor = page?.nextCursor;
    hasMore = page?.hasMore;

    if (shows.length === 0 || !nextCursor || hasMore === false) {
      break;
    }
  }

  const uniqueMovies = Array.from(
    new Map(allMovies.map((movie) => [movie.id, movie])).values(),
  );

  return {
    movies: uniqueMovies,
    totalCalls,
  };
};

const replaceMoviesCollection = async (movies) => {
  if (movies.length === 0) {
    console.log("Prepared payload is empty. Skipping movies collection refresh.");
    return false;
  }

  await Movie.deleteMany({});
  await Movie.insertMany(movies, { ordered: false });

  return true;
};

export const runMovieSyncJob = async () => {
  ensureEnvironment();
  await acquireLock();

  try {
    const { movies, totalCalls } = await collectMoviesPayload();
    const inserted = await replaceMoviesCollection(movies);

    return {
      success: true,
      totalCalls,
      preparedRecords: movies.length,
      inserted,
      message: inserted
        ? "Movies collection sync completed successfully."
        : "Prepared payload was empty. Movies collection was not updated.",
    };
  } finally {
    await releaseLock();
  }
};

export const closeMovieSyncResources = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};
