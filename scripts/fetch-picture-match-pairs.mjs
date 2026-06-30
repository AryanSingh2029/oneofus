import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const OUTPUT_DIR = "public/images/picture-match/pexels";
const OUTPUT_JSON = "src/lib/content/picture-match-pairs.json";
const REQUEST_DELAY_MS = 250;

const pictureTargets = [
  ["animals", "Animals", "Tiger", "Lion"],
  ["animals", "Animals", "Leopard", "Cheetah"],
  ["animals", "Animals", "Elephant", "Rhino"],
  ["animals", "Animals", "Horse", "Zebra"],
  ["animals", "Animals", "Dolphin", "Whale"],
  ["animals", "Animals", "Eagle", "Falcon"],
  ["animals", "Animals", "Owl", "Parrot"],
  ["animals", "Animals", "Penguin", "Puffin"],
  ["animals", "Animals", "Fox", "Wolf"],
  ["animals", "Animals", "Rabbit", "Squirrel"],
  ["food_drinks", "Food & Drinks", "Pizza", "Burger"],
  ["food_drinks", "Food & Drinks", "Pasta", "Noodles"],
  ["food_drinks", "Food & Drinks", "Coffee", "Tea"],
  ["food_drinks", "Food & Drinks", "Cake", "Cupcake"],
  ["food_drinks", "Food & Drinks", "Ice cream", "Milkshake"],
  ["food_drinks", "Food & Drinks", "Sushi", "Dumplings"],
  ["food_drinks", "Food & Drinks", "Apple", "Orange"],
  ["food_drinks", "Food & Drinks", "Popcorn", "Nachos"],
  ["places", "Places", "Beach", "Desert"],
  ["places", "Places", "Mountain", "Volcano"],
  ["places", "Places", "Forest", "Jungle"],
  ["places", "Places", "Lake", "River"],
  ["places", "Places", "Waterfall", "Fountain"],
  ["places", "Places", "Castle", "Palace"],
  ["places", "Places", "Bridge", "Tunnel"],
  ["places", "Places", "Stadium", "Theater"],
  ["transport", "Transport", "Car", "Motorcycle"],
  ["transport", "Transport", "Train", "Bus"],
  ["transport", "Transport", "Airplane", "Helicopter"],
  ["transport", "Transport", "Boat", "Jet ski"],
  ["transport", "Transport", "Bicycle", "Scooter"],
  ["transport", "Transport", "Taxi", "Ambulance"],
  ["transport", "Transport", "Tractor", "Excavator"],
  ["transport", "Transport", "Skateboard", "Roller skates"],
  ["objects", "Everyday Objects", "Camera", "Binoculars"],
  ["objects", "Everyday Objects", "Laptop", "Tablet"],
  ["objects", "Everyday Objects", "Headphones", "Speaker"],
  ["objects", "Everyday Objects", "Watch", "Sunglasses"],
  ["objects", "Everyday Objects", "Backpack", "Suitcase"],
  ["objects", "Everyday Objects", "Chair", "Table"],
  ["objects", "Everyday Objects", "Lamp", "Candle"],
  ["objects", "Everyday Objects", "Umbrella", "Raincoat"],
  ["sports", "Sports", "Football", "Basketball"],
  ["sports", "Sports", "Tennis", "Badminton"],
  ["sports", "Sports", "Cricket", "Baseball"],
  ["sports", "Sports", "Swimming", "Surfing"],
  ["sports", "Sports", "Boxing", "Karate"],
  ["sports", "Sports", "Skiing", "Snowboarding"],
  ["sports", "Sports", "Golf", "Hockey"],
  ["sports", "Sports", "Chess", "Poker"],
  ["nature", "Nature", "Rose", "Tulip"],
  ["nature", "Nature", "Sunflower", "Daisy"],
  ["nature", "Nature", "Palm tree", "Pine tree"],
  ["nature", "Nature", "Sunrise", "Sunset"],
  ["nature", "Nature", "Moon", "Stars"],
  ["nature", "Nature", "Snow", "Rain"],
  ["nature", "Nature", "Lightning", "Fire"],
  ["nature", "Nature", "Mushroom", "Cactus"],
  ["home", "Home", "Kitchen", "Bathroom"],
  ["home", "Home", "Bedroom", "Living room"],
  ["home", "Home", "Sofa", "Bed"],
  ["home", "Home", "Cup", "Bottle"],
  ["home", "Home", "Fork", "Spoon"],
  ["home", "Home", "Mirror", "Window"],
  ["home", "Home", "Door", "Gate"],
  ["home", "Home", "Bookshelf", "Wardrobe"],
  ["activities", "Activities", "Painting", "Drawing"],
  ["activities", "Activities", "Cooking", "Baking"],
  ["activities", "Activities", "Camping", "Hiking"],
  ["activities", "Activities", "Fishing", "Gardening"],
  ["activities", "Activities", "Reading", "Writing"],
  ["activities", "Activities", "Dancing", "Singing"],
  ["activities", "Activities", "Photography", "Filming"],
  ["activities", "Activities", "Shopping", "Thrifting"],
  ["tech", "Technology", "Keyboard", "Mouse"],
  ["tech", "Technology", "Drone", "Camera"],
  ["tech", "Technology", "Microphone", "Headphones"],
  ["tech", "Technology", "Tablet", "E-reader"],
  ["tech", "Technology", "Smartwatch", "Fitness tracker"],
  ["tech", "Technology", "Game controller", "Remote control"],
  ["tech", "Technology", "Robot", "Computer"],
  ["tech", "Technology", "Projector", "Television"],
  ["clothing", "Clothing", "Sneakers", "Boots"],
  ["clothing", "Clothing", "Jacket", "Sweater"],
  ["clothing", "Clothing", "Hat", "Helmet"],
  ["clothing", "Clothing", "Dress", "Suit"],
  ["clothing", "Clothing", "Gloves", "Scarf"],
  ["clothing", "Clothing", "Jeans", "Shorts"],
  ["clothing", "Clothing", "Watch", "Bracelet"],
  ["clothing", "Clothing", "Ring", "Necklace"],
  ["school", "School", "Notebook", "Textbook"],
  ["school", "School", "Pencil", "Pen"],
  ["school", "School", "Backpack", "Lunchbox"],
  ["school", "School", "Globe", "Map"],
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return readFileSync(path, "utf8")
    .split("\n")
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      return { ...env, [key]: value };
    }, {});
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function imageExtension(url) {
  const pathname = new URL(url).pathname;
  const extension = extname(pathname).toLowerCase();

  return extension && extension !== ".jpeg" ? extension : ".jpg";
}

function readExistingPairs() {
  if (!existsSync(OUTPUT_JSON)) return new Map();

  const pairs = JSON.parse(readFileSync(OUTPUT_JSON, "utf8"));

  return new Map(pairs.map((pair) => [pair.id, pair]));
}

function hasDownloadedImages(pair) {
  const civilianPath = pair.civilianImage?.replace(
    "/images/picture-match/pexels/",
    `${OUTPUT_DIR}/`,
  );
  const impostorPath = pair.impostorImage?.replace(
    "/images/picture-match/pexels/",
    `${OUTPUT_DIR}/`,
  );

  return (
    pair.civilianImage?.startsWith("/images/picture-match/pexels/") &&
    pair.impostorImage?.startsWith("/images/picture-match/pexels/") &&
    existsSync(civilianPath) &&
    existsSync(impostorPath)
  );
}

async function fetchPexelsPhoto(apiKey, query) {
  const searchParams = new URLSearchParams({
    query,
    orientation: "landscape",
    per_page: "1",
  });
  const response = await fetch(`${PEXELS_SEARCH_URL}?${searchParams}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels search failed for "${query}" (${response.status}).`);
  }

  const data = await response.json();
  const photo = data.photos?.[0];

  if (!photo) {
    throw new Error(`No Pexels photo found for "${query}".`);
  }

  return photo;
}

async function downloadImage(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}) for ${url}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(filePath, Buffer.from(arrayBuffer));
}

async function buildPhotoAsset(apiKey, pairId, side, query) {
  const photo = await fetchPexelsPhoto(apiKey, query);
  const imageUrl = photo.src?.large2x ?? photo.src?.large ?? photo.src?.medium;

  if (!imageUrl) {
    throw new Error(`Pexels photo for "${query}" did not include an image URL.`);
  }

  const fileName = `${pairId}-${side}-${slugify(query)}${imageExtension(imageUrl)}`;
  const filePath = join(OUTPUT_DIR, fileName);
  const publicPath = `/images/picture-match/pexels/${fileName}`;

  await downloadImage(imageUrl, filePath);

  return {
    image: publicPath,
    source: {
      provider: "Pexels",
      photoId: photo.id,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      url: photo.url,
    },
  };
}

async function main() {
  const localEnv = readEnvFile(".env.local");
  const apiKey = process.env.PEXELS_API_KEY ?? localEnv.PEXELS_API_KEY;
  const requestedCount = Number(process.argv[2] ?? pictureTargets.length);
  const pairCount = Math.min(requestedCount, pictureTargets.length);

  if (!apiKey) {
    throw new Error("Missing PEXELS_API_KEY. Add it to .env.local first.");
  }

  if (!Number.isInteger(pairCount) || pairCount < 1) {
    throw new Error("Pass a positive number of picture pairs to fetch.");
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const existingPairs = readExistingPairs();
  const pairs = [];

  for (const [index, target] of pictureTargets.slice(0, pairCount).entries()) {
    const [category, categoryLabel, civilian, impostor] = target;
    const id = `${category}-${String(index + 1).padStart(3, "0")}`;
    const existingPair = existingPairs.get(id);

    if (
      existingPair?.civilian === civilian &&
      existingPair?.impostor === impostor &&
      hasDownloadedImages(existingPair)
    ) {
      console.log(`Keeping ${id}: ${civilian} / ${impostor}`);
      pairs.push(existingPair);
      continue;
    }

    console.log(`Fetching ${id}: ${civilian} / ${impostor}`);

    const civilianAsset = await buildPhotoAsset(apiKey, id, "civilian", civilian);
    await wait(REQUEST_DELAY_MS);
    const impostorAsset = await buildPhotoAsset(apiKey, id, "impostor", impostor);
    await wait(REQUEST_DELAY_MS);

    pairs.push({
      id,
      category,
      categoryLabel,
      civilian,
      impostor,
      civilianImage: civilianAsset.image,
      impostorImage: impostorAsset.image,
      civilianSource: civilianAsset.source,
      impostorSource: impostorAsset.source,
    });
  }

  writeFileSync(OUTPUT_JSON, `${JSON.stringify(pairs, null, 2)}\n`);
  console.log(`Generated ${pairs.length} Picture Match pairs.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
