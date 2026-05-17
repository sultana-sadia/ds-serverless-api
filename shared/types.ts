export type Movie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
};

export type MovieReview = {
  movieId: number;
  reviewerId: string;
  reviewDate: string;
  content: string;
  rating?: number;
};
