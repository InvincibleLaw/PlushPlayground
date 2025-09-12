// assets/imagePacks.js

export const imagePacks = {
  
  //Backgrounds
 backgrounds: [

    // 0 — Blank
  { key: "0-0", bgIdx: 0, altIdx: 0, label: "Blank (default)", img: "", description: "A white screen for maximum imagination! What will you dream up today?" },

// Use Camera to Set Background
{
  key: "camera-0",       // unique string ID
  bgIdx: -1,             // special index so it won’t overlap
  altIdx: 0,             // you can leave at 0 since no alternates
  label: "Camera",
  img: null,
  isCamera: true,
  description: "Take a photo and use it as your background."},

  // 1 — Beach
{ key: "1-0", bgIdx: 1, altIdx: 0, label: "Beach", img: require('./backgrounds/beach.png'), description: "Sunny skies, sandy toes, and ocean waves for days. Build a sandcastle or bathe in the sun!" },
{ key: "1-1", bgIdx: 1, altIdx: 1, label: "Beach 2", img: require('./backgrounds/beach_alt1.png'), description: "Waves crash dramatically against rocky cliffs. Is there a hidden cave to explore?" },
{ key: "1-2", bgIdx: 1, altIdx: 2, label: "Beach 3", img: require('./backgrounds/beach_alt2.png'), description: "A quiet boardwalk with a red-and-white lighthouse guiding ships home. What secrets does the ocean whisper here?" },

// 2 — City
{ key: "2-0", bgIdx: 2, altIdx: 0, label: "City", img: require('./backgrounds/city.png'), description: "From sunny parks to bustling downtown streets and even a futuristic skyline, the city is alive with stories waiting to be told!" },
{ key: "2-1", bgIdx: 2, altIdx: 1, label: "City 2", img: require('./backgrounds/city_alt1.png'), description: "Shining towers stretch into a clear blue sky, while wide streets invite you to explore the heart of the modern city." },
{ key: "2-2", bgIdx: 2, altIdx: 2, label: "City 3", img: require('./backgrounds/city_alt2.png'), description: "Skyscrapers gleam under neon lights. Welcome to the city of tomorrow!" },

// 3 — Desert
{ key: "3-0", bgIdx: 3, altIdx: 0, label: "Desert", img: require('./backgrounds/desert.png'), description: "Golden sands and cacti under a blazing sun. Can you spot a mirage or find a secret oasis?" },
{ key: "3-1", bgIdx: 3, altIdx: 1, label: "Desert 2", img: require('./backgrounds/desert_alt1.png'), description: "Ancient temples rise from the dunes. Do they guard treasures or tell forgotten tales?" },
{ key: "3-2", bgIdx: 3, altIdx: 2, label: "Desert 3", img: require('./backgrounds/desert_alt2.png'), description: "A caravan winds through endless sand, while desert winds sing of journeys long past. Wander through these eerie cities." },

// 4 — Farm
{ key: "4-0", bgIdx: 4, altIdx: 0, label: "Farm", img: require('./backgrounds/farm.png'), description: "Rolling fields, red barns, and endless land. Plan your farm tasks for the day!" },
{ key: "4-1", bgIdx: 4, altIdx: 1, label: "Farm 2", img: require('./backgrounds/farm_alt1.png'), description: "Golden crops sway in the breeze as a thunderstorm brews in the distance. Will you chase the tornado?" },
{ key: "4-2", bgIdx: 4, altIdx: 2, label: "Farm 3", img: require('./backgrounds/farm_alt2.png'), description: "A towering windmill spins gracefully, powering the farm and telling stories of country life." },

// 5 — Forest
{ key: "5-0", bgIdx: 5, altIdx: 0, label: "Forest", img: require('./backgrounds/forest.png'), description: "Tall trees and dappled sunlight. Discover the secrets of the woods during the day." },
{ key: "5-1", bgIdx: 5, altIdx: 1, label: "Forest 2", img: require('./backgrounds/forest_alt1.png'), description: "Mossy pines stretch into the dark. Listen closely, something magical stirs in the shadows." },
{ key: "5-2", bgIdx: 5, altIdx: 2, label: "Forest 3", img: require('./backgrounds/forest_alt2.png'), description: "A hidden camper’s paradise! Trails lead to adventure, and a crackling campfire waits at dusk." },

// 6 — Grassy Plain
{ key: "6-0", bgIdx: 6, altIdx: 0, label: "Grassy Plain", img: require('./backgrounds/grassy_plain.png'), description: "Wide open green spaces perfect for running, playing, and dreaming. Watch the clouds float by or chase butterflies across the field." },
{ key: "6-1", bgIdx: 6, altIdx: 1, label: "Grassy Plain 2", img: require('./backgrounds/grassy_plain_alt1.png'), description: "Red poppies bloom as far as the eye can see. A magical meadow of color and wonder." },
{ key: "6-2", bgIdx: 6, altIdx: 2, label: "Grassy Plain 3", img: require('./backgrounds/grassy_plain_alt2.png'), description: "A lone tree stands tall in the savanna, casting the only shade in the golden grasslands." },

// 7 — Great Outdoor
{ key: "7-0", bgIdx: 7, altIdx: 0, label: "Great Outdoor", img: require('./backgrounds/great_outdoor.png'), description: "From colossal canyons to majestic mountain trails and the clouds above, the great outdoors is calling! Will you hike, explore, or simply soak in the beauty of nature’s wonders?" },
{ key: "7-1", bgIdx: 7, altIdx: 1, label: "Great Outdoor 2", img: require('./backgrounds/great_outdoor_alt1.png'), description: "Cliffs painted red by the sun create a grand canyon of adventures waiting to be discovered." },
{ key: "7-2", bgIdx: 7, altIdx: 2, label: "Great Outdoor 3", img: require('./backgrounds/great_outdoor_alt2.png'), description: "Above the mountains, endless skies fill with golden light. A world made for explorers of the clouds." },

// 8 — House
{ key: "8-0", bgIdx: 8, altIdx: 0, label: "House", img: require('./backgrounds/house.png'), description: "A cozy home where every story begins with family and friends. The door is always open for a new adventure inside." },
{ key: "8-1", bgIdx: 8, altIdx: 1, label: "House 2", img: require('./backgrounds/house_alt1.png'), description: "A serene temple stands at the end of a stone path, its red beams and quiet gardens inviting calm reflection and discovery." },
{ key: "8-2", bgIdx: 8, altIdx: 2, label: "House 3", img: require('./backgrounds/house_alt2.png'), description: "A castle with bright towers invites tales of knights, quests, and royal banquets." },

// 9 — Jungle
{ key: "9-0", bgIdx: 9, altIdx: 0, label: "Jungle", img: require('./backgrounds/jungle.png'), description: "Thick vines and wild greenery. Who knows what’s hiding in the jungle? Swing through the trees or listen for hidden creatures in caves!" },
{ key: "9-1", bgIdx: 9, altIdx: 1, label: "Jungle 2", img: require('./backgrounds/jungle_alt1.png'), description: "A roaring waterfall crashes into a lagoon. Will you dive in or search for hidden treasure nearby?" },
{ key: "9-2", bgIdx: 9, altIdx: 2, label: "Jungle 3", img: require('./backgrounds/jungle_alt2.png'), description: "The jungle cave opens to glowing flowers and secret paths. A wild maze for daring adventurers." },

// 10 — Play
{ key: "10-0", bgIdx: 10, altIdx: 0, label: "Play", img: require('./backgrounds/play.png'), description: "Step right up to a world of slides, rides and endless fun! Will you climb, jump or spin your way through these adventures?" },
{ key: "10-1", bgIdx: 10, altIdx: 1, label: "Play 2", img: require('./backgrounds/play_alt1.png'), description: "Inside a colorful playroom, toys wait to come alive in your next big story." },
{ key: "10-2", bgIdx: 10, altIdx: 2, label: "Play 3", img: require('./backgrounds/play_alt2.png'), description: "A carnival ferris wheel lights up the sky. Spin high above and see the whole world of fun below!" },

// 11 — Space
{ key: "11-0", bgIdx: 11, altIdx: 0, label: "Space", img: require('./backgrounds/space.png'), description: "Explore a mysterious universe filled with stars and alien wonders. Every step is a new cosmic adventure!" },
{ key: "11-1", bgIdx: 11, altIdx: 1, label: "Space 2", img: require('./backgrounds/space_alt1.png'), description: "Planets drift past glowing nebulas. What kind of creatures live among the stars?" },
{ key: "11-2", bgIdx: 11, altIdx: 2, label: "Space 3", img: require('./backgrounds/space_alt2.png'), description: "A swirling galaxy unfolds like a cosmic painting. Endless mysteries to explore beyond the stars." },

// 12 — Snow
{ key: "12-0", bgIdx: 12, altIdx: 0, label: "Snow", img: require('./backgrounds/snow.png'), description: "Snowy peaks and chilly air. Ready for an icy adventure? Bundle up and slide down the slopes or build a frosty snowman!" },
{ key: "12-1", bgIdx: 12, altIdx: 1, label: "Snow 2", img: require('./backgrounds/snow_alt1.png'), description: "Glaciers stretch across the horizon, shimmering under the pale winter sun." },
{ key: "12-2", bgIdx: 12, altIdx: 2, label: "Snow 3", img: require('./backgrounds/snow_alt2.png'), description: "An icy cave near a frozen sea. The perfect place for a frosty expedition." },

// 13 — Water
{ key: "13-0", bgIdx: 13, altIdx: 0, label: "Water", img: require('./backgrounds/water.png'), description: "Brilliant coral reefs line the ocean floor, bursting with color as you swim freely through the open sea with endless adventures ahead." },
{ key: "13-1", bgIdx: 13, altIdx: 1, label: "Water 2", img: require('./backgrounds/water_alt1.png'), description: "Dive into a hidden sea cave where a pirate’s chest lies waiting — will you uncover gold, jewels, or a new adventure beneath the waves?" },
{ key: "13-2", bgIdx: 13, altIdx: 2, label: "Water 3", img: require('./backgrounds/water_alt2.png'), description: "A bright yellow submarine explores the ocean depths. What adventures await in the deep abyss?" },

],


  //Affiliate Images
  bottle_buddies: [
    { label: "Elephant Buddy",
       img: require('./bottle_buddies/elephant.png'),
       description: 'Soft elephant ultra-plush. High quality with embroidered eyes and crinkle ears. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    { label: "Giraffe Buddy", 
       img: require('./bottle_buddies/giraffe.png'),
       description: 'Soft giraffe ultra-plush. High quality with embroidered eyes and thin giraffe neck for small hands to grip onto. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    { label: "Lion Buddy", 
       img: require('./bottle_buddies/lion.png'),
       description: 'Soft lion ultra-plush. High quality with embroidered eyes and realistic mane hair. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    { label: "Elephant Buddy Side", 
       img: require('./bottle_buddies/elephant_side.png'),
       description: 'Soft elephant ultra-plush. High quality with embroidered eyes and crinkle ears. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    { label: "Giraffe Buddy Side", 
       img: require('./bottle_buddies/giraffe_side.png'),
       description: 'Soft giraffe ultra-plush. High quality with embroidered eyes and thin giraffe neck for small hands to grip onto. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    { label: "Lion Buddy Side", 
      img: require('./bottle_buddies/lion_side.png'),
      description: 'Soft lion ultra-plush. High quality with embroidered eyes and realistic mane hair. Perfect size plush to start encouraging babies to explore and begin finger stimulation.', },
    // add more as needed
  ],

//Plush Images
  farm_plushies: [
    { label: "Barn Cat",
       img: require('./farm_plushies/barn_cat.png'),
       description: 'A playful barn cat who loves chasing mice and curling up in the hay.', },
    { label: "Chicken", 
       img: require('./farm_plushies/chicken.png'),
       description: 'A cheerful little chicken, always clucking and pecking around the farmyard.', },
    { label: "Cow", 
       img: require('./farm_plushies/cow.png'),
       description: 'A gentle cow with a big heart and an even bigger moo!', },
    { label: "Donkey", 
       img: require('./farm_plushies/donkey.png'),
       description: 'A loyal donkey who’s always ready to lend a helping hoof.', },
    { label: "Duckling", 
       img: require('./farm_plushies/duckling.png'),
       description: 'A fluffy duckling who waddles after friends wherever they go.', },
    { label: "Farm Dog", 
       img: require('./farm_plushies/farm_dog.png'),
       description: 'A brave and friendly farm dog who keeps everyone safe.', },
    { label: "Goat", 
       img: require('./farm_plushies/goat.png'),
       description: 'A silly goat who loves climbing and nibbling on everything.', },
    { label: "Horse", 
       img: require('./farm_plushies/horse.png'),
       description: 'A gentle farm horse with a soft mane and a big heart, always ready to trot along with friends.', },
    { label: "Piglet", 
       img: require('./farm_plushies/piglet.png'),
       description: 'A chubby little piglet who loves rolling in the mud.', },
    { label: "Sheep", 
       img: require('./farm_plushies/sheep.png'),
       description: 'A cuddly sheep with the softest wool on the farm.', },

      ],

forest_plushies: [
  { label: "Beaver",
    img: require('./forest_plushies/beaver.png'),
    description: 'A busy beaver who loves building dams and nibbling on twigs.', },
  { label: "Black Bear",
    img: require('./forest_plushies/black_bear.png'),
    description: 'A cuddly black bear who waddles through the forest looking for berries.', },
  { label: "Bluebird",
    img: require('./forest_plushies/bluebird.png'),
    description: 'A cheerful bluebird who sings the sweetest songs at sunrise.', },
  { label: "Brown Squirrel",
    img: require('./forest_plushies/brown_squirrel.png'),
    description: 'A quick brown squirrel who stuffs its cheeks full of acorns.', },
  { label: "Deer",
    img: require('./forest_plushies/deer.png'),
    description: 'A gentle deer fawn who prances softly between the trees.', },
  { label: "Forest Hare",
    img: require('./forest_plushies/forest_hare.png'),
    description: 'A speedy forest hare who hops happily through the meadow.', },
  { label: "Lizard",
    img: require('./forest_plushies/lizard.png'),
    description: 'A curious little lizard who sunbathes on warm forest rocks.', },
  { label: "Panda",
    img: require('./forest_plushies/panda.png'),
    description: 'A playful panda who loves munching bamboo and rolling around.', },
  { label: "Red Fox",
    img: require('./forest_plushies/red_fox.png'),
    description: 'A clever red fox who sneaks through the woods with a fluffy tail.', },
  { label: "Wild Boar",
    img: require('./forest_plushies/wild_boar.png'),
    description: 'A plucky wild boar who snuffles the ground for tasty treats.', },
],

city_plushies: [
  { label: "Black Cat",
    img: require('./city_plushies/black_cat.png'),
    description: 'A sleek black cat who prowls the alleys with a playful pounce.', },
  { label: "City Dog", 
    img: require('./city_plushies/city_dog.png'),
    description: 'A loyal city dog who loves long walks and wagging at strangers.', },
  { label: "City Squirrel", 
    img: require('./city_plushies/city_squirrel.png'),
    description: 'A clever squirrel who scurries through trees and hides tasty snacks.', },
  { label: "Mouse", 
    img: require('./city_plushies/mouse.png'),
    description: 'A tiny mouse with big ears and an even bigger sense of adventure.', },
  { label: "Hedgehog", 
    img: require('./city_plushies/hedgehog.png'),
    description: 'A shy hedgehog who curls up into a tiny ball when surprised.', },
  { label: "Owl", 
    img: require('./city_plushies/owl.png'),
    description: 'A wise little owl who loves to hoot from rooftops at night.', },
  { label: "Pigeon", 
    img: require('./city_plushies/pigeon.png'),
    description: 'A plump pigeon who struts proudly through the busy sidewalks.', },
  { label: "Raccoon", 
    img: require('./city_plushies/raccoon.png'),
    description: 'A mischievous raccoon always on the hunt for shiny treasures.', },
  { label: "Skunk", 
    img: require('./city_plushies/skunk.png'),
    description: 'A striped skunk who waddles around but is cuter than you think.', },
  { label: "Street Cat", 
    img: require('./city_plushies/street_cat.png'),
    description: 'A curious street cat with bright eyes and a bold city spirit.', },
],


grassy_plains_plushies: [
  { label: "Cheetah",
    img: require('./grassy_plains_plushies/cheetah.png'),
    description: 'A speedy cheetah cub who loves playing tag but always wins!', },
  { label: "Elephant",
    img: require('./grassy_plains_plushies/elephant.png'),
    description: 'A gentle elephant calf with floppy ears and a tiny trumpeting trunk.', },
  { label: "Giraffe",
    img: require('./grassy_plains_plushies/giraffe.png'),
    description: 'A tall giraffe calf who loves peeking over the grass to spot friends.', },
  { label: "Hippopotamus",
    img: require('./grassy_plains_plushies/hippopotamus.png'),
    description: 'A chubby hippo calf who splashes around and wiggles its tiny ears.', },
  { label: "Hyena",
    img: require('./grassy_plains_plushies/hyena.png'),
    description: 'A cheeky hyena pup who giggles at everything and loves making mischief.', },
  { label: "Lion",
    img: require('./grassy_plains_plushies/lion.png'),
    description: 'A brave lion cub who practices tiny roars that sound more like squeaks.', },
  { label: "Lioness",
    img: require('./grassy_plains_plushies/lioness.png'),
    description: 'A caring lioness who watches over the plains and cuddles her cubs.', },
  { label: "Meerkat",
    img: require('./grassy_plains_plushies/meerkat.png'),
    description: 'A curious meerkat who pops up on tippy toes to say hello to everyone.', },
  { label: "Wildebeest",
    img: require('./grassy_plains_plushies/wildebeest.png'),
    description: 'A clumsy wildebeest calf who trips often but bounces right back up.', },
  { label: "Zebra",
    img: require('./grassy_plains_plushies/zebra.png'),
    description: 'A stripy zebra foal who loves to run and show off its zig-zag patterns.', },
],

snow_plushies: [
  { label: "Arctic Fox",
    img: require('./snow_plushies/artic_fox.png'),
    description: 'A fluffy arctic fox who blends into the snow but loves to play peekaboo.', },
  { label: "Arctic Wolf",
    img: require('./snow_plushies/artic_wolf.png'),
    description: 'A brave arctic wolf pup who howls at the frosty moon.', },
  { label: "Moose",
    img: require('./snow_plushies/moose.png'),
    description: 'A young moose with tiny antlers who stomps proudly through the snow.', },
  { label: "Penguin",
    img: require('./snow_plushies/penguin.png'),
    description: 'A waddly penguin who slides on its belly for fun.', },
  { label: "Polar Bear",
    img: require('./snow_plushies/polar_bear.png'),
    description: 'A polar bear cub who builds snowy forts and pretends to be the king of the Arctic.', },
  { label: "Reindeer",
    img: require('./snow_plushies/reindeer.png'),
    description: 'A reindeer with twinkly eyes who dreams of flying one day.', },
  { label: "Seal",
    img: require('./snow_plushies/seal.png'),
    description: 'A playful seal who wiggles and flops across the icy shore.', },
  { label: "Snow Hare",
    img: require('./snow_plushies/snow_hare.png'),
    description: 'A snowy hare who hops lightly and leaves tiny paw prints behind.', },
  { label: "Snow Mouse",
    img: require('./snow_plushies/snow_mouse.png'),
    description: 'A tiny snow mouse who scurries quickly and hides in snowy burrows.', },
  { label: "Snowy Owl",
    img: require('./snow_plushies/snowy_owl.png'),
    description: 'A wise snowy owl who watches quietly from frosty treetops.', },
],


  // Add more packs here if needed
};
