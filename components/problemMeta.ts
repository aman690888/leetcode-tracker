export type Difficulty = "Easy" | "Medium" | "Hard";

export interface ProblemMeta {
  difficulty: Difficulty;
  topic: string;
}

const KNOWN_MAP: Record<string, ProblemMeta> = {
  // Common array / intro
  "create-target-array-in-the-given-order": { difficulty: "Easy", topic: "Array" },
  "number-of-good-pairs": { difficulty: "Easy", topic: "Hash Table" },
  "shuffle-the-array": { difficulty: "Easy", topic: "Array" },
  "concatenation-of-array": { difficulty: "Easy", topic: "Array" },
  "defanging-an-ip-address": { difficulty: "Easy", topic: "String" },
  "score-of-a-string": { difficulty: "Easy", topic: "String" },
  "running-sum-of-1d-array": { difficulty: "Easy", topic: "Prefix Sum" },
  "richest-customer-wealth": { difficulty: "Easy", topic: "Matrix" },
  "find-the-highest-altitude": { difficulty: "Easy", topic: "Prefix Sum" },
  "find-pivot-index": { difficulty: "Easy", topic: "Prefix Sum" },
  "can-place-flowers": { difficulty: "Easy", topic: "Greedy" },
  "set-mismatch": { difficulty: "Easy", topic: "Hash Table" },
  "baseball-game": { difficulty: "Easy", topic: "Stack" },
  "number-of-1-bits": { difficulty: "Easy", topic: "Bit Manipulation" },
  "minimum-common-value": { difficulty: "Easy", topic: "Two Pointers" },
  "intersection-of-two-arrays": { difficulty: "Easy", topic: "Hash Table" },
  "intersection-of-two-arrays-ii": { difficulty: "Easy", topic: "Two Pointers" },

  // Classic LeetCode
  "two-sum": { difficulty: "Easy", topic: "Hash Table" },
  "contains-duplicate": { difficulty: "Easy", topic: "Hash Table" },
  "contains-duplicate-ii": { difficulty: "Easy", topic: "Sliding Window" },
  "valid-anagram": { difficulty: "Easy", topic: "Hash Table" },
  "group-anagrams": { difficulty: "Medium", topic: "Hash Table" },
  "top-k-frequent-elements": { difficulty: "Medium", topic: "Heap" },
  "product-of-array-except-self": { difficulty: "Medium", topic: "Prefix Sum" },
  "valid-sudoku": { difficulty: "Medium", topic: "Matrix" },
  "longest-consecutive-sequence": { difficulty: "Medium", topic: "Hash Table" },

  // Two Pointers
  "valid-palindrome": { difficulty: "Easy", topic: "Two Pointers" },
  "two-sum-ii-input-array-is-sorted": { difficulty: "Medium", topic: "Two Pointers" },
  "3sum": { difficulty: "Medium", topic: "Two Pointers" },
  "container-with-most-water": { difficulty: "Medium", topic: "Two Pointers" },
  "trapping-rain-water": { difficulty: "Hard", topic: "Two Pointers" },

  // Sliding Window
  "best-time-to-buy-and-sell-stock": { difficulty: "Easy", topic: "Greedy" },
  "longest-substring-without-repeating-characters": { difficulty: "Medium", topic: "Sliding Window" },
  "longest-repeating-character-replacement": { difficulty: "Medium", topic: "Sliding Window" },
  "permutation-in-string": { difficulty: "Medium", topic: "Sliding Window" },
  "minimum-window-substring": { difficulty: "Hard", topic: "Sliding Window" },

  // Stack
  "valid-parentheses": { difficulty: "Easy", topic: "Stack" },
  "min-stack": { difficulty: "Medium", topic: "Stack" },
  "evaluate-reverse-polish-notation": { difficulty: "Medium", topic: "Stack" },
  "daily-temperatures": { difficulty: "Medium", topic: "Monotonic Stack" },
  "car-fleet": { difficulty: "Medium", topic: "Stack" },
  "largest-rectangle-in-histogram": { difficulty: "Hard", topic: "Stack" },

  // Binary Search
  "binary-search": { difficulty: "Easy", topic: "Binary Search" },
  "search-a-2d-matrix": { difficulty: "Medium", topic: "Binary Search" },
  "koko-eating-bananas": { difficulty: "Medium", topic: "Binary Search" },
  "find-minimum-in-rotated-sorted-array": { difficulty: "Medium", topic: "Binary Search" },
  "search-in-rotated-sorted-array": { difficulty: "Medium", topic: "Binary Search" },
  "median-of-two-sorted-arrays": { difficulty: "Hard", topic: "Binary Search" },

  // Linked List
  "reverse-linked-list": { difficulty: "Easy", topic: "Linked List" },
  "merge-two-sorted-lists": { difficulty: "Easy", topic: "Linked List" },
  "reorder-list": { difficulty: "Medium", topic: "Linked List" },
  "remove-nth-node-from-end-of-list": { difficulty: "Medium", topic: "Linked List" },
  "copy-list-with-random-pointer": { difficulty: "Medium", topic: "Linked List" },
  "add-two-numbers": { difficulty: "Medium", topic: "Linked List" },
  "linked-list-cycle": { difficulty: "Easy", topic: "Two Pointers" },
  "find-the-duplicate-number": { difficulty: "Medium", topic: "Two Pointers" },
  "merge-k-sorted-lists": { difficulty: "Hard", topic: "Heap" },

  // Trees
  "invert-binary-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "maximum-depth-of-binary-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "diameter-of-binary-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "balanced-binary-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "same-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "subtree-of-another-tree": { difficulty: "Easy", topic: "Binary Tree" },
  "lowest-common-ancestor-of-a-binary-search-tree": { difficulty: "Medium", topic: "BST" },
  "binary-tree-level-order-traversal": { difficulty: "Medium", topic: "BFS" },
  "kth-smallest-element-in-a-bst": { difficulty: "Medium", topic: "BST" },

  // DP & Math
  "climbing-stairs": { difficulty: "Easy", topic: "DP" },
  "min-cost-climbing-stairs": { difficulty: "Easy", topic: "DP" },
  "house-robber": { difficulty: "Medium", topic: "DP" },
  "coin-change": { difficulty: "Medium", topic: "DP" },
  "longest-increasing-subsequence": { difficulty: "Medium", topic: "DP" },
  "single-number": { difficulty: "Easy", topic: "Bit Manipulation" },
  "missing-number": { difficulty: "Easy", topic: "Bit Manipulation" },
  "counting-bits": { difficulty: "Easy", topic: "Bit Manipulation" },
  "reverse-bits": { difficulty: "Easy", topic: "Bit Manipulation" },
};

export function getProblemMeta(slug: string, title?: string): ProblemMeta {
  const normSlug = slug.toLowerCase().trim();
  if (KNOWN_MAP[normSlug]) {
    return KNOWN_MAP[normSlug];
  }

  // Heuristics
  const combined = (normSlug + " " + (title || "")).toLowerCase();

  let topic = "Array";
  if (combined.includes("tree") || combined.includes("bst") || combined.includes("inorder")) {
    topic = "Trees";
  } else if (combined.includes("list") || combined.includes("node")) {
    topic = "Linked List";
  } else if (combined.includes("string") || combined.includes("anagram") || combined.includes("word")) {
    topic = "String";
  } else if (combined.includes("stack") || combined.includes("parenthes") || combined.includes("polish")) {
    topic = "Stack";
  } else if (combined.includes("search") || combined.includes("binary")) {
    topic = "Binary Search";
  } else if (combined.includes("pointer") || combined.includes("sum") || combined.includes("sorted")) {
    topic = "Two Pointers";
  } else if (combined.includes("bit") || combined.includes("xor") || combined.includes("hamming")) {
    topic = "Bit Manipulation";
  } else if (combined.includes("dp") || combined.includes("climb") || combined.includes("robber") || combined.includes("coin")) {
    topic = "DP";
  } else if (combined.includes("graph") || combined.includes("island") || combined.includes("course")) {
    topic = "Graphs";
  }

  let difficulty: Difficulty = "Easy";
  if (combined.includes("hard") || combined.includes("trapping") || combined.includes("histogram") || combined.includes("median")) {
    difficulty = "Hard";
  } else if (
    combined.includes("medium") ||
    combined.includes("longest") ||
    combined.includes("reorder") ||
    combined.includes("koko") ||
    combined.includes("rotated") ||
    combined.includes("3sum") ||
    combined.includes("container")
  ) {
    difficulty = "Medium";
  }

  return { difficulty, topic };
}
