import { Movie } from "../shared/types";

export const movies: Movie[] = [
  {
    id: 1234,
    title: "The Shawshank Redemption",
    overview: "A banker convicted of uxoricide forms a friendship over a quarter century with a hardened convict.",
    release_date: "1995-03-01",
  },
  {
    id: 2345,
    title: "The Godfather",
    overview: "The aging patriarch of an organized crime dynasty transfers control to his reluctant son.",
    release_date: "1972-03-24",
  },
  {
    id: 3456,
    title: "The Dark Knight",
    overview: "When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest tests.",
    release_date: "2008-07-18",
  },
];

export const reviews = [
  {
    movieId: 1234,
    reviewerId: "userA",
    reviewDate: "2024-01-15",
    content: "An absolutely brilliant film. Moving and inspirational.",
  },
  {
    movieId: 1234,
    reviewerId: "userB",
    reviewDate: "2024-02-20",
    content: "One of the greatest films ever made. Highly recommended.",
  },
  {
    movieId: 2345,
    reviewerId: "userA",
    reviewDate: "2024-03-10",
    content: "A masterpiece of cinema. Brando is outstanding.",
  },
];