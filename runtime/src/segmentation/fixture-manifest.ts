import type { ReadingProfile } from "./types";

export type FixtureCategory = "markers" | "semantic" | "layout" | "app";

export type FixtureExpectation = {
  file: string;
  category: FixtureCategory;
  expectedSlideCount: number;
  expectedProfile: ReadingProfile;
};

export const FIXTURE_MANIFEST: FixtureExpectation[] = [
  {
    file: "markers-quarterly-report.html",
    category: "markers",
    expectedSlideCount: 4,
    expectedProfile: "slides",
  },
  {
    file: "markers-product-pitch.html",
    category: "markers",
    expectedSlideCount: 5,
    expectedProfile: "slides",
  },
  {
    file: "markers-recipe-walkthrough.html",
    category: "markers",
    expectedSlideCount: 3,
    expectedProfile: "slides",
  },
  {
    file: "markers-onboarding-tutorial.html",
    category: "markers",
    expectedSlideCount: 4,
    expectedProfile: "slides",
  },
  {
    file: "markers-team-retro.html",
    category: "markers",
    expectedSlideCount: 3,
    expectedProfile: "slides",
  },
  {
    file: "semantic-blog-post.html",
    category: "semantic",
    expectedSlideCount: 3,
    expectedProfile: "slides",
  },
  {
    file: "semantic-faq.html",
    category: "semantic",
    expectedSlideCount: 4,
    expectedProfile: "slides",
  },
  {
    file: "semantic-changelog.html",
    category: "semantic",
    expectedSlideCount: 5,
    expectedProfile: "slides",
  },
  {
    file: "semantic-article-hr.html",
    category: "semantic",
    expectedSlideCount: 4,
    expectedProfile: "slides",
  },
  {
    file: "semantic-study-guide.html",
    category: "semantic",
    expectedSlideCount: 4,
    expectedProfile: "slides",
  },
  {
    file: "layout-long-article.html",
    category: "layout",
    expectedSlideCount: 2,
    expectedProfile: "pages",
  },
  {
    file: "layout-photo-gallery.html",
    category: "layout",
    expectedSlideCount: 5,
    expectedProfile: "pages",
  },
  {
    file: "layout-terms-of-service.html",
    category: "layout",
    expectedSlideCount: 3,
    expectedProfile: "pages",
  },
  {
    file: "layout-feature-list.html",
    category: "layout",
    expectedSlideCount: 2,
    expectedProfile: "pages",
  },
  {
    file: "layout-timeline.html",
    category: "layout",
    expectedSlideCount: 2,
    expectedProfile: "pages",
  },
  {
    file: "app-calculator.html",
    category: "app",
    expectedSlideCount: 1,
    expectedProfile: "app",
  },
  {
    file: "app-canvas-game.html",
    category: "app",
    expectedSlideCount: 1,
    expectedProfile: "app",
  },
  {
    file: "app-dashboard.html",
    category: "app",
    expectedSlideCount: 1,
    expectedProfile: "app",
  },
  {
    file: "app-todo-list.html",
    category: "app",
    expectedSlideCount: 1,
    expectedProfile: "app",
  },
  {
    file: "app-color-picker.html",
    category: "app",
    expectedSlideCount: 1,
    expectedProfile: "app",
  },
];
