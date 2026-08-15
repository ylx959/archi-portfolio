function createProjectDetail(title, location, typology, category, year, description, image, images, galleryImages, fullDescription) {
    return {
        title: title,
        location: location,
        typology: typology,
        category: category,
        year: year,
        description: description,
        // The card thumbnail. It used to exist only as a background-image rule in
        // project-grid.css, which is why adding a project meant editing the
        // stylesheet as well; keeping it on the entry lets the grid build its own
        // cards, so a project is described here and nowhere else.
        cardImage: image,
        images: images || Array(10).fill(image),
        galleryImages: galleryImages || images || Array(10).fill(image),
        fullDescription: fullDescription || ""
    };
}

const project1DetailImages = ["1.jpg", "1-2.jpg", "2.jpg", "2-1.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "12.jpg", "13.jpg"].map(function (imageName) {
    return "../assets/images/projects/project1/detail/" + imageName + "?v=3";
});

const project1GalleryImages = ["0.jpg", "1.jpg", "1-1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "2-1.jpg", "2-2.jpg", "2-3.jpg", "2-4.jpg", "2-5.jpg", "2-6.jpg", "2-7.jpg", "3-1.jpg", "3-2.jpg", "3-3.jpg", "3-4.jpg", "3-5.jpg", "3-6.jpg", "3-7.jpg", "3-8.jpg", "3-9.jpg", "4-1.jpg", "4-2.jpg", "4-3.jpg", "4-4.jpg", "4-5.jpg", "4-6.jpg", "4-7.jpg", "4-8.jpg", "5-1.jpg", "5-2.jpg", "5-3.jpg", "5-4.jpg", "5-5.jpg", "5-6.jpg", "5-7.jpg"].map(function (imageName) {
    return "../assets/images/projects/project1/gallery/" + imageName + "?v=2";
});

const project1Description = [
    "This project creates a multifunctional workshop for a school, replacing isolated studios with a more open and collective spatial structure.",
    "Expanded indoor and outdoor public areas turn the building into a vessel for interaction, exchange, and unexpected creative reactions among students."
];

const project1FullDescription = "Instead of separating making, discussion, and circulation into fixed zones, the proposal allows these activities to overlap throughout the building. Studio work can spill into shared areas, informal critiques can happen along circulation paths, and outdoor spaces become part of the daily rhythm of learning rather than leftover space around the building.\n\nThis arrangement encourages students to encounter work outside their own discipline and to understand creativity as something that grows through contact. The architecture supports moments of watching, joining, pausing, and exchanging, so the school environment becomes more fluid and socially active.\n\nBy treating the workshop as a living container for unpredictable interaction, the project values process as much as finished work. Its spatial organization is designed to make collaboration feel natural, allowing different ideas, routines, and personalities to meet and generate new possibilities.";

const project3DetailImages = ["1.jpg", "2.jpg", "2-1.jpg", "2-2.jpg", "2-3.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg"].map(function (imageName) {
    return "../assets/images/projects/project3/detail/" + imageName + "?v=3";
});

const project3GalleryImages = ["1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "2-1.jpg", "3-1.jpg", "3-2.jpg", "3-3.jpg", "3-3-1.jpg", "3-3-2.jpg", "3-3-3.jpg", "3-3-4.jpg", "3-3-5.jpg", "3-3-6.jpg", "3-4.jpg", "3-5.jpg", "3-6.jpg", "3-7.jpg", "3-8.jpg", "3-9.jpg", "3-10.jpg", "3-11.jpg", "3-12.jpg", "3-13.jpg", "3-14.jpg", "4-1.jpg", "4-2.jpg", "4-3.jpg", "4-4.jpg", "4-5.jpg", "4-6.jpg", "4-7.jpg", "4-8.jpg", "4-9.jpg", "4-11.jpg", "5-1.jpg"].map(function (imageName) {
    return "../assets/images/projects/project3/gallery/" + imageName + "?v=2";
});

const project4DetailImages = ["1.jpg", "1-2.jpg", "1-3.jpg", "2-1.jpg", "2-2.jpg", "2-3-1.jpg", "2-3-2.jpg", "2-9.jpg", "2-10.jpg", "3-1.jpg", "3-3.jpg"].map(function (imageName) {
    return "../assets/images/projects/project4/detail/" + imageName + "?v=3";
});

const project4GalleryImages = ["0.jpg", "0-1.jpg", "1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "1-5.jpg", "2-1.jpg", "2-2.jpg", "2-3-1.jpg", "2-3-2.jpg", "2-4-1.jpg", "2-4-2.jpg", "2-5-1.jpg", "2-5-2.jpg", "2-6.jpg", "2-7.jpg", "2-8.jpg", "2-9.jpg", "2-10.jpg", "2-11.jpg", "2-11-2.jpg", "3-1.jpg", "3-2.jpg", "3-3.jpg"].map(function (imageName) {
    return "../assets/images/projects/project4/gallery/" + imageName + "?v=3";
});

const project4Description = [
    "As cities continue to grow in density and available land becomes increasingly limited, residential developments are rapidly expanding in the vertical dimension.",
    "This project adopts a Vertical Grid system as the primary organizational and architectural framework, integrating residential units, green terraces, and planting structures into a coherent three-dimensional ecological network."
];

const project4FullDescription = "To challenge the repetitive stacking commonly found in residential towers, the housing units are deliberately arranged in a staggered configuration. By shifting units forward and backward on different floors, a variety of intermediate spaces are created, including terraces, semi-outdoor platforms, and shared gardens. These spaces provide opportunities for relaxation, informal gatherings, and everyday social interaction, encouraging a stronger sense of community among residents.\n\nThe greenery extends throughout the vertical grid and into these shared spaces, transforming vegetation from a decorative element into an integral component of daily life. Through the integration of nature, architecture, and social activities, the project seeks to create a vertical living environment that promotes both ecological sustainability and community engagement.\n\nBy combining a vertical grid system with staggered residential units, the project reintroduces greenery, interaction, and shared experiences into high-density housing, creating a sustainable and socially connected vertical community.";

const project8DetailImages = ["1-1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "1-5.jpg", "1-6.jpg", "1.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg"].map(function (imageName) {
    return "../assets/images/projects/project8/detail/" + imageName + "?v=4";
});

const project8GalleryImages = ["1-1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "1-5.jpg", "1-6.jpg", "1-6-2.jpg", "1-7-1.jpg", "1-7-2.jpg", "1-8.jpg", "1-9.jpg", "1-10.jpg", "1-11.jpg", "1-12.jpg", "1-13.jpg", "1-14.jpg", "1-15.jpg", "1-16.jpg", "2-1.jpg", "2-2.jpg", "2-3.jpg", "3-1.jpg", "3-2.jpg", "3-3.jpg", "3-4.jpg", "4-1.jpg", "4-2.jpg", "4-3.jpg", "4-4.jpg", "4-5.jpg", "5-1.jpg", "5-2.jpg", "5-3.jpg", "6-1.jpg", "6-2.jpg", "6-3.jpg", "6-4.jpg", "7-1.jpg", "7-2.jpg", "7-3.jpg", "7-4.jpg", "7-5.jpg", "8-1.jpg", "8-2.jpg", "9-1.jpg"].map(function (imageName) {
    return "../assets/images/projects/project8/gallery/" + imageName + "?v=3";
});

const project9DetailImages = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.png", "12.jpg", "13.png", "14.png", "15.jpg", "16.jpg"].map(function (imageName) {
    return "../assets/images/projects/project9/detail/" + imageName + "?v=6";
});

const project9GalleryImages = ["1-1.jpg", "1-2.jpg", "2-1.jpg", "2-2.jpg", "2-3.jpg", "2-4.jpg", "2-5.jpg", "2-6.jpg", "3-1.jpg", "3-2.jpg", "3-3.jpg", "3-4.jpg", "3-5.jpg", "4-1.jpg", "4-2.jpg", "4-3.jpg", "4-4.jpg", "4-5.jpg", "4-6.jpg", "4-7.jpg", "4-8.jpg", "4-9.jpg", "5-1.jpg", "5-2.jpg", "5-3.jpg", "5-4.jpg", "5-5.jpg", "6-1.jpg", "6-2.jpg", "6-3.jpg", "6-4.jpg", "6-5.jpg", "6-6.jpg", "6-7.jpg", "6-8.jpg", "6-9.jpg", "6-10.jpg", "6-11.jpg", "6-12.jpg", "6-13.jpg", "6-14.jpg", "6-15.png", "6-16.jpg", "6-17.jpg", "7-1.jpg", "7-2.jpg", "7-3.jpg", "7-4.jpg", "7-5.jpg", "7-6.jpg", "7-7.jpg", "7-8.jpg", "8-1.jpg", "8-2.jpg", "8-3.jpg", "8-4.jpg", "8-5.jpg", "8-6-1.jpg", "8-6.jpg", "8-7.png", "9-1.jpg", "9-2.jpg", "9-3.jpg", "9-4.jpg", "9-5.jpg", "9-6.jpg", "9-7.jpg", "9-8.png", "9-9.jpg", "10-1.png", "10-2.jpg", "10-3.jpg", "10-4.jpg", "10-5.jpg"].map(function (imageName) {
    return "../assets/images/projects/project9/gallery/" + imageName + "?v=3";
});

const project9Description = [
    "This project explores how architecture can reconnect fragmented layers of a historic waterfront.",
    "Located within Helsinki's South Harbour, the proposal transforms a disused warehouse into a narrative museum that bridges the city's maritime past and its contemporary urban life."
];

const project9FullDescription = "Through a sequence of vertical and horizontal circulation routes, visitors are guided across different spatial and historical layers, connecting the abandoned industrial structures with the active waterfront, the Old Market Hall, and the Helsinki Cathedral district.\n\nRather than treating heritage as a static artifact, the project views history as a living process. By weaving together movement, memory, and urban regeneration, the museum creates a continuous narrative between the harbour's industrial legacy and its evolving future.\n\nThe design seeks not only to preserve history, but to reactivate it - allowing forgotten spaces to become part of Helsinki's collective experience once again. As visitors move through the building and along the waterfront, architecture becomes a narrative journey, revealing the interconnected relationship between trade, migration, culture, and the identity of Helsinki as a maritime city.";

const project8Description = [
    "I have always been fascinated by ports. Unlike the clearly defined centers of cities, ports exist at the edge, between land and sea, between the known and the unknown.",
    "Since the Age of Exploration, ports have served as gateways connecting people to the wider world, yet today many have been reduced to logistical infrastructures or redeveloped as commercial waterfronts."
];

const project8FullDescription = "In Helsinki South Harbour, however, this condition still remains. Ferries continue to arrive and depart, while people gather, wait, and move through the waterfront. The harbor remains an active threshold where history and contemporary life coexist.\n\nThe Port Narrative Museum is conceived not simply as a museum of Helsinki's maritime history, but as a space that allows visitors to experience the condition of standing at a boundary. Through architecture, the project explores the universal relationship between people, movement, and the world beyond the horizon.";

const project3Description = [
    "A church should be more than a place of worship; it should become part of daily life and the surrounding community.",
    "The project explores how spaces for gathering, learning, support, and reflection can create a more open and welcoming spiritual environment."
];

const project3FullDescription = "The proposal rethinks sacred space as something that can remain active beyond ceremony. Flexible rooms, learning areas, social spaces, and support programs allow the building to serve different groups at different times, creating a more continuous relationship between spiritual practice and ordinary routines.\n\nLight, material, threshold, and circulation are used to shape a gradual transition from public openness to quieter moments of reflection. Rather than relying only on symbolic form, the atmosphere is built through proportion, pause, and carefully framed movement.\n\nThrough this expanded role, the church becomes a generous civic presence as well as a spiritual one. It offers places for care, conversation, guidance, and cultural exchange, helping the building strengthen social bonds while remaining calm, accessible, and emotionally grounded.";

const project5GalleryImages = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "8-1.jpg", "8-2.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg", "21.jpg", "22.jpg", "23.jpg", "24.jpg", "25.jpg", "26.jpg", "27.jpg", "28.jpg"].map(function (imageName) {
    return "../assets/images/projects/project5/gallery/" + imageName + "?v=2";
});

const project5DetailImages = ["1.jpg", "2.jpg", "8-2.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "21.jpg", "22.jpg", "25.jpg", "26.jpg", "27.jpg", "28.jpg"].map(function (imageName) {
    return "../assets/images/projects/project5/detail/" + imageName + "?v=3";
});

const project5Description = [
    "Scene of Sense is developed as an architectural proposal rooted in atmosphere, spatial sequence, and material restraint.",
    "The project begins with a close reading of movement, pause, and the emotional rhythm produced between enclosure and openness."
];

const project5FullDescription = "Rather than treating form as a singular object, the project is organized as a series of linked moments, where threshold, proportion, light, and visual compression gradually shape the experience of the whole. The intention is to create a setting that feels measured and quiet, while still carrying emotional depth through contrast, texture, and pacing.\n\nAcross the proposal, surfaces are edited carefully so that each junction, opening, and transition contributes to a more continuous architectural narrative. Light is used not only to illuminate the space, but also to structure attention, soften boundaries, and clarify the hierarchy between public and intimate zones.\n\nMaterial choices are imagined as part of the same composition, allowing weight, reflection, shadow, and tactile presence to work together instead of competing for emphasis. In this way, Scene of Sense becomes less a static formal statement and more a carefully paced environment, where each movement reveals another layer of spatial character, visual stillness, and lived atmosphere over time.";

const project6GalleryImages = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "5-1.jpg", "6.jpg", "6-1.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg", "21.jpg", "22.jpg", "23.jpg", "24.jpg", "25.jpg", "26.jpg", "27.jpg", "28.jpg", "29.jpg"].map(function (imageName) {
    return "../assets/images/projects/project6/gallery/" + imageName + "?v=2";
});

const project6DetailImages = ["1.jpg", "2.jpg", "5.jpg", "5-1.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg", "24.jpg", "25.jpg", "27.jpg", "28.jpg", "29.jpg"].map(function (imageName) {
    return "../assets/images/projects/project6/detail/" + imageName + "?v=3";
});

const project6FullDescription = "The proposal examines how architecture can support an interdisciplinary research environment where technological experimentation, human-centered design, and biomedical innovation are brought into closer relationship. Rather than treating laboratories as isolated technical rooms, the project considers them as active spaces for exchange, observation, collaboration, and shared discovery.\n\nDifferent research activities require different degrees of openness, privacy, flexibility, and technical control, so the spatial organization responds to changing forms of scientific work. Laboratory spaces, collaborative learning areas, circulation, and shared public zones are arranged to encourage both focused research and informal interdisciplinary interaction.\n\nThrough this approach, the project rethinks the conventional laboratory typology as a more adaptive and communicative architectural framework. The lab becomes not only a place for scientific production, but also a spatial interface between emerging technology, design thinking, education, and contemporary social challenges.";

const project6Description = [
    "This campus proposal, derived from a previous design, explores the integration of interaction design and biomedical engineering.",
    "It focuses on spatial innovation, conceptual transformation, and laboratory scales that respond to evolving societal needs."
];

// The published projects, in the order they appear in the grid. project-grid.js
// renders one card per entry, so this array is the only place that decides what
// the site shows — there is no matching markup in index.html to keep in step.
window.MINEPORT_PROJECT_DETAIL_DATA = [
    createProjectDetail("Double Interaction", "Campus workshop", "Education", "Architecture", "2024 Summer", project1Description, "../assets/images/projects/project1/card/project1.jpg?v=1", project1DetailImages, project1GalleryImages, project1FullDescription),
    createProjectDetail("Euphoria", "Senior Center", "Residential", "Architecture", "2023 Fall", ["Located in Toad Mountain, Taipei, this Senior Center uses dispersed volumes for resting, rehabilitation, social interaction, and reading, giving elderly users a freer and gentler daily rhythm."], "../assets/images/projects/project2/card/project2.jpg?v=1", ["1.jpg", "2-3.jpg", "2-4.jpg", "2-5.jpg", "2-6.png", "3.jpg", "4.jpg", "5.jpg", "5-1.jpg", "12.png", "13.png"].map(function (imageName) {
        return "../assets/images/projects/project2/detail/" + imageName + "?v=5";
    }), ["1.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.png", "12.png", "13.png", "14.jpg", "15.jpg", "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.png", "21.jpg"].map(function (imageName) {
        return "../assets/images/projects/project2/gallery/" + imageName + "?v=12";
    }), "Following the slope and existing vegetation, the architecture creates a softer boundary between built space and landscape. Semi-outdoor corridors, courtyards, and shaded transitional areas allow movement to become part of the daily experience, giving users access to air, light, and greenery without relying on a single central hall.\n\nThe project emphasizes familiarity and legibility through variations in scale, openings, and materiality, helping residents recognize and navigate each area with ease. Communal spaces are balanced with quiet corners, supporting both social connection and moments of personal rest.\n\nUltimately, the senior center is imagined as a living community integrated with nature and everyday routines. Aging is treated not as a condition of isolation, but as a continuous experience supported by movement, care, and a gentle relationship with the surrounding environment."),
    createProjectDetail("Light, Stone, Hope", "Church", "Religious", "Architecture", "2024 Fall", project3Description, "../assets/images/projects/project3/card/project3.jpg?v=1", project3DetailImages, project3GalleryImages, project3FullDescription),
    createProjectDetail("Vertical Forest", "Collective Housing", "Residential", "Architecture", "2024 Spring", project4Description, "../assets/images/projects/project4/card/project4.jpg?v=1", project4DetailImages, project4GalleryImages, project4FullDescription),
    createProjectDetail("Scene of Sense", "Children's Theater", "Culture", "Architecture", "2023 Winter", project5Description, "../assets/images/projects/project5/card/project5.jpg?v=1", project5DetailImages, project5GalleryImages, project5FullDescription),
    createProjectDetail("Meditouch", "Interdisciplinary Lab", "Education", "Architecture", "2025 Summer", project6Description, "../assets/images/projects/project6/card/project6.jpg?v=1", project6DetailImages, project6GalleryImages, project6FullDescription),
    createProjectDetail("Kitchenless", "COLLECTIVE HOUSING", "Residential", "Architecture", "2024 Winter", ["This kitchenless social housing concept optimizes space and cost while encouraging community through shared kitchens.", "It responds to food delivery, meal services, and sustainability trends with a more affordable, resource-efficient model for urban living."], "../assets/images/projects/project7/card/project7.jpg?v=1", [1, 6, 7, 9, 10, 11, 12, 14, 18].map(function (imageNumber) {
        return "../assets/images/projects/project7/detail/" + imageNumber + ".jpg?v=3";
    }), ["1.jpg", "1-1.jpg", "1-2.jpg", "1-3.jpg", "1-4.jpg", "2.jpg", "3.jpg", "4.jpg", "4-1.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg", "11.jpg", "11-1.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg", "16.jpg", "16-1.jpg", "17.jpg", "18.jpg", "18-2.jpg", "18-3.jpg", "18-4.jpg", "19.jpg", "20.jpg"].map(function (imageName) {
        return "../assets/images/projects/project7/gallery/" + imageName + "?v=5";
    }), "Cooking is reimagined as a collective routine that can produce social contact as well as daily support. Shared food spaces become places where residents meet, exchange help, and build small rituals of community, while the private units remain compact, efficient, and easier to maintain.\n\nThe proposal also responds to changing urban habits, where delivery services, prepared meals, and shared facilities alter the role of the domestic kitchen. Instead of duplicating the same infrastructure in every unit, resources are concentrated into communal areas that can serve more people with greater flexibility.\n\nIn this model, housing becomes more than a collection of rooms. It operates as a resource-conscious living system that reduces cost, limits redundancy, and creates stronger social ties through the shared use of space."),
    createProjectDetail("Not Just a Museum", "Harbor Narrative Museum vol.1", "Culture", "Architecture", "2025 Fall", project8Description, "../assets/images/projects/project8/card/project8.jpg?v=1", project8DetailImages, project8GalleryImages, project8FullDescription),
    createProjectDetail("Not Just a Museum", "Harbor Narrative Museum vol.2", "Culture", "Architecture", "2026 Summer", project9Description, "../assets/images/projects/project9/card/project9.jpg?v=1", project9DetailImages, project9GalleryImages, project9FullDescription)
];

// Parked, not on the site. While the cards were static markup these three sat at
// the end of the array above and were silently dropped by a slice(0, cardCount);
// now that every entry becomes a card they have to be somewhere explicit instead.
// All three reuse the images and titles of projects 4, 5 and 6. Move an entry back
// into the array above to publish it — nothing else needs editing.
window.MINEPORT_UNPUBLISHED_PROJECT_DATA = [
    createProjectDetail("Vertical Forest", "Collective Housing", "Residential", "Architecture", "2020-2024", project4Description, "../assets/images/projects/project4/card/project4.jpg?v=1", project4DetailImages, project4GalleryImages, project4FullDescription),
    createProjectDetail("Stone Horizon House", "Los Angeles, USA", "Education", "Design", "2019-2026", ["A spatial design proposal centered on editing, restraint, and the visual weight of each surface condition.", "The composition seeks balance between tactile intimacy and overall formal control."], "../assets/images/projects/project5/card/project5.jpg?v=1", project5DetailImages, project5GalleryImages),
    createProjectDetail("Meditouch", "Interdisciplinary Lab", "Religious", "Architecture", "2018-2022", project6Description, "../assets/images/projects/project6/card/project6.jpg?v=1", project6DetailImages, project6GalleryImages, project6FullDescription)
];
