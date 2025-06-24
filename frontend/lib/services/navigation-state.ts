interface NavigationState {
  libraryScrollPosition: number;
  librarySearchQuery: string;
  libraryStatusFilter: string;
  libraryTypeFilter: string;
  librarySortBy: string;
  librarySelectedItem: string | null;
  readerLastVisited: string | null;
}

class NavigationStateService {
  private readonly STORAGE_KEY = "nexus-navigation-state";

  private getState(): NavigationState {
    if (typeof window === "undefined") {
      return this.getDefaultState();
    }

    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultState(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn("Failed to parse navigation state:", error);
    }

    return this.getDefaultState();
  }

  private getDefaultState(): NavigationState {
    return {
      libraryScrollPosition: 0,
      librarySearchQuery: "",
      libraryStatusFilter: "all",
      libraryTypeFilter: "all",
      librarySortBy: "created_at_desc",
      librarySelectedItem: null,
      readerLastVisited: null,
    };
  }

  private setState(newState: Partial<NavigationState>) {
    if (typeof window === "undefined") return;

    try {
      const currentState = this.getState();
      const updatedState = { ...currentState, ...newState };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedState));
    } catch (error) {
      console.warn("Failed to save navigation state:", error);
    }
  }

  // Library state management
  saveLibraryState(state: {
    scrollPosition?: number;
    searchQuery?: string;
    statusFilter?: string;
    typeFilter?: string;
    sortBy?: string;
    selectedItem?: string | null;
  }) {
    this.setState({
      libraryScrollPosition: state.scrollPosition,
      librarySearchQuery: state.searchQuery,
      libraryStatusFilter: state.statusFilter,
      libraryTypeFilter: state.typeFilter,
      librarySortBy: state.sortBy,
      librarySelectedItem: state.selectedItem,
    });
  }

  getLibraryState() {
    const state = this.getState();
    return {
      scrollPosition: state.libraryScrollPosition,
      searchQuery: state.librarySearchQuery,
      statusFilter: state.libraryStatusFilter,
      typeFilter: state.libraryTypeFilter,
      sortBy: state.librarySortBy,
      selectedItem: state.librarySelectedItem,
    };
  }

  // Reader state management
  saveReaderVisit(contentId: string) {
    this.setState({
      readerLastVisited: contentId,
    });
  }

  getLastVisitedReader(): string | null {
    return this.getState().readerLastVisited;
  }

  // Cleanup
  clear() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const navigationState = new NavigationStateService();
