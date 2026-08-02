export type Slide = {
  index: number;
  startChild: number;
  endChild: number;
  label: string;
};

export type ReadingProfile = "slides" | "pages" | "app";

export type SegmentResult = {
  slides: Slide[];
  profile: ReadingProfile;
};
