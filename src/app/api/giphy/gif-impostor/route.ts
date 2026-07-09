import { NextResponse } from "next/server";
import gifImpostorPairs from "@/lib/content/gif-impostor-pairs.json";

type GifImpostorPair = {
  civilian: string;
  impostor: string;
};

type GiphyImage = {
  height?: string;
  mp4?: string;
  url?: string;
  webp?: string;
  width?: string;
};

type GiphyGif = {
  images?: {
    fixed_height?: GiphyImage;
    original?: GiphyImage;
  };
  title?: string;
};

type GiphySearchResponse = {
  data?: GiphyGif[];
  meta?: {
    msg?: string;
    status?: number;
  };
  pagination?: {
    total_count?: number;
  };
};

const pairs = gifImpostorPairs as GifImpostorPair[];
const rateLimitMessage =
  "GIFs are taking a break right now. Please wait a bit and try again.";
const rateLimitCooldownMs = 60 * 60 * 1000;

let giphyRateLimitedUntil = 0;

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GIPHY_API_KEY;
  const now = Date.now();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GIPHY_API_KEY in .env.local." },
      { status: 500 },
    );
  }

  if (now < giphyRateLimitedUntil) {
    return NextResponse.json(
      {
        error: rateLimitMessage,
        retryAfterSeconds: Math.ceil((giphyRateLimitedUntil - now) / 1000),
      },
      { status: 429 },
    );
  }

  const pair = pairs[Math.floor(Math.random() * pairs.length)];

  try {
    const civilianGif = await fetchGiphyGif(pair.civilian, apiKey);
    const impostorGif = await fetchGiphyGif(pair.impostor, apiKey);

    return NextResponse.json({
      civilian: pair.civilian,
      civilianGif,
      impostor: pair.impostor,
      impostorGif,
    });
  } catch (error) {
    if (error instanceof GiphyRateLimitError) {
      giphyRateLimitedUntil = Date.now() + rateLimitCooldownMs;

      return NextResponse.json(
        {
          error: rateLimitMessage,
          retryAfterSeconds: Math.ceil(rateLimitCooldownMs / 1000),
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load GIFs from GIPHY.",
      },
      { status: 502 },
    );
  }
}

async function fetchGiphyGif(query: string, apiKey: string) {
  const response = await fetch(buildGiphySearchUrl(query, apiKey), {
    cache: "no-store",
  });

  if (response.status === 429) {
    throw new GiphyRateLimitError();
  }

  if (!response.ok) {
    throw new Error("GIFs could not load right now. Please try again.");
  }

  const data = (await response.json()) as GiphySearchResponse;
  const playableGifs = data.data?.filter((candidate) => toGifMedia(candidate)) ?? [];
  const gif = playableGifs[Math.floor(Math.random() * playableGifs.length)];
  const media = gif ? toGifMedia(gif) : null;

  if (!gif || !media) {
    throw new Error(`No playable GIPHY result found for "${query}".`);
  }

  return {
    alt: gif.title?.trim() || query,
    height: media.height,
    mp4Url: media.mp4Url,
    query,
    webpUrl: media.webpUrl,
    width: media.width,
  };
}

function buildGiphySearchUrl(query: string, apiKey: string) {
  const params = new URLSearchParams({
    api_key: apiKey,
    bundle: "messaging_non_clips",
    lang: "en",
    limit: "25",
    q: query,
    rating: "pg-13",
  });

  return `https://api.giphy.com/v1/gifs/search?${params.toString()}`;
}

class GiphyRateLimitError extends Error {
  constructor() {
    super("GIPHY rate limit reached.");
  }
}

function toGifMedia(gif: GiphyGif) {
  const image = gif.images?.fixed_height ?? gif.images?.original;

  if (!image?.mp4 && !image?.webp && !image?.url) return null;

  return {
    height: Number(image.height) || 360,
    mp4Url: image.mp4,
    webpUrl: image.webp ?? image.url,
    width: Number(image.width) || 480,
  };
}
