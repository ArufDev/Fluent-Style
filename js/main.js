// Blog System with Markdown Support
class BlogSystem {
  constructor() {
    this.posts = [];
    this.filteredPosts = [];
    this.currentPost = null;
    this.isDarkMode = localStorage.getItem("darkMode") === "true";

    this.init();
  }

  async init() {
    this.setupDarkMode();
    this.setupEventListeners();
    this.setupRouting();
    await this.loadPosts();
    this.renderPosts();
    this.handleInitialRoute();
  }

  setupRouting() {
    // Listen for hash changes
    window.addEventListener("hashchange", () => {
      this.handleRouteChange();
    });
  }

  handleInitialRoute() {
    // Handle initial route when page loads
    this.handleRouteChange();
  }

  handleRouteChange() {
    const hash = window.location.hash;

    if (hash.startsWith("#/")) {
      const postId = hash.substring(2); // Remove '#/' prefix
      const post = this.posts.find((p) => p.id === postId);

      if (post) {
        this.openPost(postId, false); // false = don't update hash again
      } else {
        // Post not found, redirect to home
        this.showHomePage();
      }
    } else {
      // No hash or invalid hash, show home page
      this.showHomePage();
    }
  }
  setupDarkMode() {
    const html = document.documentElement;
    const darkModeToggle = document.getElementById("darkModeToggle");

    if (this.isDarkMode) {
      html.classList.add("dark");
    }

    darkModeToggle.addEventListener("click", () => {
      this.isDarkMode = !this.isDarkMode;
      html.classList.toggle("dark");
      localStorage.setItem("darkMode", this.isDarkMode);
    });
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById("searchInput");
    const mobileSearchInput = document.getElementById("mobileSearchInput");

    const handleSearch = (e) => {
      const query = e.target.value.toLowerCase().trim();
      this.filterPosts(query);
    };

    searchInput.addEventListener("input", handleSearch);
    mobileSearchInput.addEventListener("input", handleSearch);

    // Sync search inputs
    searchInput.addEventListener("input", (e) => {
      mobileSearchInput.value = e.target.value;
    });

    mobileSearchInput.addEventListener("input", (e) => {
      searchInput.value = e.target.value;
    });

    // Back button
    document.getElementById("backButton").addEventListener("click", () => {
      this.showHomePage();
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.showHomePage();
      }
    });
  }

  async loadPosts() {
    try {
      // Get list of markdown files
      const markdownFiles = [
        "tips-merawat-galon.md",
        "belajar-javascript-modern.md",
        "css-grid-vs-flexbox.md",
        "testing.md",
      ];

      const posts = [];

      for (const filename of markdownFiles) {
        try {
          const response = await fetch(`posts/${filename}`);
          if (!response.ok) continue;

          const content = await response.text();
          const post = this.parseMarkdownPost(content, filename);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.warn(`Failed to load ${filename}:`, error);
        }
      }

      // Sort posts by date (newest first)
      this.posts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.filteredPosts = [...this.posts];
    } catch (error) {
      console.error("Error loading posts:", error);
      // Fallback to empty array
      this.posts = [];
      this.filteredPosts = [];
    }
  }

  parseMarkdownPost(content, filename) {
    try {
      // Simple frontmatter parser
      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      if (!match) {
        console.warn(`No frontmatter found in ${filename}`);
        return null;
      }

      const [, frontmatterStr, markdownContent] = match;
      const frontmatter = this.parseFrontmatter(frontmatterStr);

      // Generate ID from filename
      const id = filename
        .replace(".md", "")
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase();

      return {
        id,
        title: frontmatter.title || "Untitled",
        excerpt: frontmatter.excerpt || this.generateExcerpt(markdownContent),
        date: frontmatter.date || new Date().toISOString().split("T")[0],
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        category: frontmatter.category || "Uncategorized",
        author: frontmatter.author || "Anonymous",
        content: markdownContent.trim(),
      };
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
      return null;
    }
  }

  parseFrontmatter(frontmatterStr) {
    const frontmatter = {};
    const lines = frontmatterStr.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex).trim();
      let value = trimmedLine.substring(colonIndex + 1).trim();

      // Handle arrays (simple format: [item1, item2, item3])
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim());
      }

      frontmatter[key] = value;
    }

    return frontmatter;
  }

  generateExcerpt(content) {
    // Remove markdown syntax and get first paragraph
    const plainText = content
      .replace(/#{1,6}\s+/g, "") // Remove headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/`(.*?)`/g, "$1") // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .trim();

    const firstParagraph = plainText.split("\n\n")[0];
    return firstParagraph.length > 150
      ? firstParagraph.substring(0, 150) + "..."
      : firstParagraph;
  }

  filterPosts(query) {
    if (!query) {
      this.filteredPosts = [...this.posts];
    } else {
      this.filteredPosts = this.posts.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          post.category.toLowerCase().includes(query) ||
          post.author.toLowerCase().includes(query)
      );
    }
    this.renderPosts();
  }

  renderPosts() {
    const container = document.getElementById("blogPosts");
    const noResults = document.getElementById("noResults");
    const postCount = document.getElementById("postCount");

    // Update post count
    postCount.textContent = `${this.filteredPosts.length} artikel`;

    if (this.filteredPosts.length === 0) {
      container.innerHTML = "";
      noResults.classList.remove("hidden");
      return;
    }

    noResults.classList.add("hidden");

    container.innerHTML = this.filteredPosts
      .map(
        (post, index) => `
            <div class="masonry-item">
                <article class="glass-card rounded-2xl p-6 backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 shadow-xl cursor-pointer fade-in-up opacity-0 transition-all duration-300" 
                         onclick="blogSystem.openPost('${post.id}', true)"
                         style="animation-delay: ${index * 0.1}s">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex flex-wrap gap-2">
                            ${post.tags
                              .map(
                                (tag) => `
                                <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    ${tag}
                                </span>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                        ${post.title}
                    </h2>
                    
                    <p class="text-gray-600 dark:text-gray-300 mb-4">
                        ${post.excerpt}
                    </p>
                    
                    <div class="flex justify-between items-center">
                        <div class="flex flex-col">
                            <span class="text-sm text-gray-500 dark:text-gray-400">
                                ${this.formatDate(post.date)}
                            </span>
                            <span class="text-xs text-gray-400 dark:text-gray-500">
                                oleh ${post.author}
                            </span>
                        </div>
                        <button class="glass-button px-4 py-2 rounded-lg backdrop-blur-md bg-white/30 dark:bg-gray-800/30 border border-white/20 dark:border-gray-700/20 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/40 dark:hover:bg-gray-700/40 transition-all duration-200">
                            Baca Selengkapnya
                            <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                    </div>
                </article>
            </div>
        `
      )
      .join("");

    // Trigger animations
    setTimeout(() => {
      container.querySelectorAll(".fade-in-up").forEach((el) => {
        el.style.opacity = "1";
      });
    }, 100);
  }

  openPost(postId, updateHash = true) {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return;

    this.currentPost = post;

    // Update URL hash if requested
    if (updateHash) {
      window.location.hash = `#/${postId}`;
    }

    // Hide home page content
    document.getElementById("heroSection").style.display = "none"; // Hero section
    document.getElementById("blogPostsSection").style.display = "none"; // Blog posts section

    // Show article page
    const articlePage = document.getElementById("articlePage");
    articlePage.classList.remove("hidden");

    // Render article metadata
    const articleMeta = document.getElementById("articleMeta");
    articleMeta.innerHTML = `
            <div class="flex flex-wrap gap-2 mb-4">
                ${post.tags
                  .map(
                    (tag) => `
                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        ${tag}
                    </span>
                `
                  )
                  .join("")}
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
                ${post.title}
            </h1>
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    ${this.formatDate(post.date)}
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    ${post.author}
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    ${post.category}
                </div>
            </div>
        `;

    // Render markdown content
    const articleContent = document.getElementById("articleContent");
    articleContent.innerHTML = marked.parse(post.content);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  showHomePage() {
    // Update URL hash to empty
    if (window.location.hash) {
      window.location.hash = "";
    }

    // Hide article page
    const articlePage = document.getElementById("articlePage");
    articlePage.classList.add("hidden");

    // Show home page content
    document.getElementById("heroSection").style.display = "block"; // Hero section
    document.getElementById("blogPostsSection").style.display = "block"; // Blog posts section

    // Scroll to top
    window.scrollTo(0, 0);

    this.currentPost = null;
  }

  formatDate(dateString) {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("id-ID", options);
  }
}

// Initialize the blog system when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.blogSystem = new BlogSystem();
});

// Add some utility CSS classes for line clamping
const style = document.createElement("style");
style.textContent = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
