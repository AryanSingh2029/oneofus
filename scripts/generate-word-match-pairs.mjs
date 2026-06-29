import { writeFileSync } from "node:fs";

const categories = {
  famous_people: {
    label: "Famous People",
    clusters: [
      ["Taylor Swift", "Ariana Grande", "Dua Lipa", "Billie Eilish", "Rihanna", "Beyonce", "Lady Gaga", "Katy Perry"],
      ["Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Johnny Depp", "Robert Downey Jr.", "Will Smith", "Keanu Reeves", "Ryan Reynolds"],
      ["Zendaya", "Emma Stone", "Margot Robbie", "Jennifer Lawrence", "Scarlett Johansson", "Anne Hathaway", "Natalie Portman", "Gal Gadot"],
      ["Cristiano Ronaldo", "Lionel Messi", "Neymar", "Kylian Mbappe", "Erling Haaland", "Mohamed Salah", "Harry Kane", "Luka Modric"],
      ["Serena Williams", "Roger Federer", "Rafael Nadal", "Novak Djokovic", "Naomi Osaka", "Simone Biles", "Usain Bolt", "Michael Phelps"],
      ["Elon Musk", "Jeff Bezos", "Bill Gates", "Mark Zuckerberg", "Steve Jobs", "Sundar Pichai", "Satya Nadella", "Tim Cook"],
      ["Barack Obama", "Nelson Mandela", "Mahatma Gandhi", "Martin Luther King Jr.", "Winston Churchill", "Abraham Lincoln", "Queen Elizabeth II", "Dalai Lama"],
      ["Albert Einstein", "Isaac Newton", "Marie Curie", "Nikola Tesla", "Stephen Hawking", "Charles Darwin", "Ada Lovelace", "Alan Turing"],
    ],
  },
  movies_tv: {
    label: "Movies & TV Shows",
    clusters: [
      ["Iron Man", "Captain America", "Thor", "Black Panther", "Doctor Strange", "Spider-Man", "The Avengers", "Guardians of the Galaxy"],
      ["Batman", "Superman", "Wonder Woman", "Aquaman", "The Flash", "Joker", "Justice League", "Suicide Squad"],
      ["Friends", "How I Met Your Mother", "The Big Bang Theory", "Brooklyn Nine-Nine", "The Office", "Parks and Recreation", "Modern Family", "Seinfeld"],
      ["Game of Thrones", "House of the Dragon", "The Witcher", "The Lord of the Rings", "Harry Potter", "Narnia", "Shadow and Bone", "His Dark Materials"],
      ["Stranger Things", "Dark", "Black Mirror", "The X-Files", "Westworld", "Lost", "Severance", "The Last of Us"],
      ["Breaking Bad", "Better Call Saul", "Narcos", "Money Heist", "Ozark", "Peaky Blinders", "The Sopranos", "Fargo"],
      ["Toy Story", "Finding Nemo", "Shrek", "Kung Fu Panda", "Frozen", "Moana", "Inside Out", "Coco"],
      ["Titanic", "Avatar", "Jurassic Park", "Star Wars", "Inception", "The Matrix", "Interstellar", "The Dark Knight"],
    ],
  },
  animals: {
    label: "Animals",
    clusters: [
      ["Lion", "Tiger", "Leopard", "Jaguar", "Cheetah", "Panther", "Lynx", "Cougar"],
      ["Wolf", "Fox", "Dog", "Coyote", "Jackal", "Dingo", "Husky", "German Shepherd"],
      ["Eagle", "Hawk", "Falcon", "Owl", "Vulture", "Parrot", "Peacock", "Swan"],
      ["Shark", "Dolphin", "Whale", "Octopus", "Squid", "Jellyfish", "Seal", "Sea Turtle"],
      ["Cow", "Goat", "Sheep", "Horse", "Donkey", "Pig", "Buffalo", "Camel"],
      ["Snake", "Crocodile", "Alligator", "Lizard", "Iguana", "Chameleon", "Turtle", "Komodo Dragon"],
      ["Ant", "Bee", "Wasp", "Butterfly", "Moth", "Dragonfly", "Beetle", "Grasshopper"],
      ["Gorilla", "Chimpanzee", "Orangutan", "Monkey", "Baboon", "Lemur", "Gibbon", "Macaque"],
    ],
  },
  countries_cities: {
    label: "Countries & Cities",
    clusters: [
      ["France", "Italy", "Spain", "Portugal", "Germany", "Netherlands", "Belgium", "Switzerland"],
      ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan", "Thailand", "Indonesia"],
      ["Japan", "South Korea", "China", "Vietnam", "Singapore", "Malaysia", "Philippines", "Taiwan"],
      ["United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Peru", "Colombia"],
      ["London", "Paris", "Rome", "Madrid", "Berlin", "Amsterdam", "Vienna", "Prague"],
      ["New York", "Los Angeles", "Chicago", "San Francisco", "Miami", "Boston", "Seattle", "Las Vegas"],
      ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Jaipur"],
      ["Dubai", "Doha", "Riyadh", "Abu Dhabi", "Istanbul", "Cairo", "Marrakech", "Jerusalem"],
    ],
  },
  food_drinks: {
    label: "Food & Drinks",
    clusters: [
      ["Pizza", "Burger", "Hot Dog", "Sandwich", "Taco", "Burrito", "Wrap", "Shawarma"],
      ["Pasta", "Noodles", "Ramen", "Lasagna", "Mac and Cheese", "Spaghetti", "Risotto", "Dumplings"],
      ["Biryani", "Fried Rice", "Pulao", "Paella", "Sushi", "Kebab", "Curry", "Butter Chicken"],
      ["Coffee", "Tea", "Hot Chocolate", "Latte", "Cappuccino", "Espresso", "Green Tea", "Masala Chai"],
      ["Cola", "Lemonade", "Orange Juice", "Smoothie", "Milkshake", "Iced Tea", "Energy Drink", "Soda"],
      ["Ice Cream", "Cake", "Brownie", "Cupcake", "Donut", "Pancake", "Waffle", "Cheesecake"],
      ["Apple", "Banana", "Mango", "Orange", "Grapes", "Pineapple", "Watermelon", "Strawberry"],
      ["Chips", "Popcorn", "Nachos", "Fries", "Pretzel", "Crackers", "Samosa", "Spring Roll"],
    ],
  },
  jobs_professions: {
    label: "Jobs & Professions",
    clusters: [
      ["Doctor", "Nurse", "Surgeon", "Dentist", "Pharmacist", "Therapist", "Paramedic", "Veterinarian"],
      ["Teacher", "Professor", "Tutor", "Principal", "Librarian", "Coach", "Trainer", "Counselor"],
      ["Engineer", "Architect", "Mechanic", "Electrician", "Plumber", "Carpenter", "Welder", "Technician"],
      ["Software Developer", "Data Scientist", "Product Manager", "Designer", "Cybersecurity Analyst", "QA Tester", "DevOps Engineer", "IT Support"],
      ["Chef", "Baker", "Barista", "Waiter", "Bartender", "Restaurant Manager", "Caterer", "Food Critic"],
      ["Lawyer", "Judge", "Police Officer", "Detective", "Firefighter", "Soldier", "Security Guard", "Pilot"],
      ["Actor", "Singer", "Dancer", "Director", "Photographer", "Writer", "Journalist", "Comedian"],
      ["Accountant", "Banker", "Salesperson", "Consultant", "Entrepreneur", "Receptionist", "HR Manager", "Real Estate Agent"],
    ],
  },
  brands: {
    label: "Brands",
    clusters: [
      ["Apple", "Samsung", "Google", "Microsoft", "Sony", "Dell", "HP", "Lenovo"],
      ["Nike", "Adidas", "Puma", "Reebok", "New Balance", "Under Armour", "Converse", "Vans"],
      ["Coca-Cola", "Pepsi", "Sprite", "Fanta", "Red Bull", "Monster", "Gatorade", "Mountain Dew"],
      ["McDonald's", "Burger King", "KFC", "Subway", "Domino's", "Pizza Hut", "Starbucks", "Dunkin"],
      ["Toyota", "Honda", "BMW", "Mercedes-Benz", "Audi", "Tesla", "Ford", "Volkswagen"],
      ["Netflix", "Disney+", "YouTube", "Spotify", "Prime Video", "Hulu", "HBO", "Twitch"],
      ["Zara", "H&M", "Gucci", "Prada", "Louis Vuitton", "Chanel", "Uniqlo", "Levi's"],
      ["Amazon", "Flipkart", "Walmart", "Target", "IKEA", "eBay", "Alibaba", "Costco"],
    ],
  },
  hobbies_activities: {
    label: "Hobbies & Activities",
    clusters: [
      ["Football", "Basketball", "Cricket", "Tennis", "Badminton", "Volleyball", "Baseball", "Hockey"],
      ["Running", "Cycling", "Swimming", "Hiking", "Yoga", "Gym", "Boxing", "Rock Climbing"],
      ["Painting", "Drawing", "Sketching", "Pottery", "Calligraphy", "Photography", "Origami", "Crafting"],
      ["Reading", "Writing", "Blogging", "Journaling", "Poetry", "Storytelling", "Podcasting", "Debating"],
      ["Cooking", "Baking", "Gardening", "Fishing", "Camping", "Birdwatching", "Stargazing", "Traveling"],
      ["Chess", "Poker", "Board Games", "Video Games", "Puzzles", "Sudoku", "Crossword", "Trivia"],
      ["Singing", "Dancing", "Acting", "Stand-up Comedy", "Karaoke", "DJing", "Playing Guitar", "Playing Piano"],
      ["Shopping", "Collecting Coins", "Collecting Stamps", "Thrifting", "Model Building", "Scrapbooking", "Makeup", "Fashion Styling"],
    ],
  },
  music_bands: {
    label: "Music & Bands",
    clusters: [
      ["The Beatles", "The Rolling Stones", "Queen", "Pink Floyd", "Led Zeppelin", "Nirvana", "Metallica", "U2"],
      ["Coldplay", "Imagine Dragons", "Maroon 5", "OneRepublic", "Linkin Park", "Green Day", "Arctic Monkeys", "The Killers"],
      ["BTS", "BLACKPINK", "NewJeans", "EXO", "TWICE", "Stray Kids", "SEVENTEEN", "Red Velvet"],
      ["Drake", "Kendrick Lamar", "J. Cole", "Eminem", "Travis Scott", "Kanye West", "Post Malone", "Jay-Z"],
      ["Taylor Swift", "Ed Sheeran", "Adele", "Bruno Mars", "Justin Bieber", "The Weeknd", "Harry Styles", "Olivia Rodrigo"],
      ["Arijit Singh", "A. R. Rahman", "Shreya Ghoshal", "Sonu Nigam", "Atif Aslam", "Neha Kakkar", "Badshah", "Diljit Dosanjh"],
      ["Guitar", "Piano", "Drums", "Violin", "Flute", "Saxophone", "Trumpet", "Tabla"],
      ["Pop", "Rock", "Hip Hop", "Jazz", "Classical", "EDM", "Country", "Reggae"],
    ],
  },
  everyday_objects: {
    label: "Everyday Objects",
    clusters: [
      ["Phone", "Laptop", "Tablet", "Charger", "Headphones", "Keyboard", "Mouse", "Power Bank"],
      ["Chair", "Table", "Sofa", "Bed", "Cupboard", "Shelf", "Desk", "Stool"],
      ["Plate", "Bowl", "Spoon", "Fork", "Knife", "Cup", "Bottle", "Mug"],
      ["Toothbrush", "Toothpaste", "Soap", "Shampoo", "Towel", "Comb", "Mirror", "Razor"],
      ["Pen", "Pencil", "Notebook", "Eraser", "Sharpener", "Stapler", "Scissors", "Tape"],
      ["Keys", "Wallet", "Watch", "Sunglasses", "Backpack", "Umbrella", "Mask", "Water Bottle"],
      ["Remote", "Television", "Speaker", "Fan", "Lamp", "Clock", "Router", "Extension Cord"],
      ["Shoes", "Socks", "Jacket", "Hat", "Belt", "Gloves", "Scarf", "T-shirt"],
    ],
  },
};

function pairCluster(items) {
  const pairs = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      pairs.push([items[leftIndex], items[rightIndex]]);
    }
  }

  return pairs;
}

const output = Object.entries(categories).flatMap(([category, config]) => {
  const pairs = config.clusters.flatMap(pairCluster).slice(0, 200);

  if (pairs.length !== 200) {
    throw new Error(`${config.label} generated ${pairs.length} pairs instead of 200.`);
  }

  return pairs.map(([civilian, impostor], index) => ({
    id: `${category}-${String(index + 1).padStart(3, "0")}`,
    category,
    categoryLabel: config.label,
    civilian,
    impostor,
  }));
});

writeFileSync(
  "src/lib/content/word-match-pairs.json",
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(`Generated ${output.length} Word Match pairs.`);
