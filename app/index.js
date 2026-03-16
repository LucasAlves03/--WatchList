import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/styles';
import {API_KEY} from '../config'

const TMDB_API_KEY = TMDB_API_KEY;

const genreMap = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [watchLater, setWatchLater] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('dateAdded');
  const [selectedGenre, setSelectedGenre] = useState('all');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const saveWatchlist = React.useCallback(async () => {
    try {
      await AsyncStorage.setItem('watchlist', JSON.stringify(watchLater));
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  }, [watchLater]);

  useEffect(() => {
    saveWatchlist();
  }, [saveWatchlist]);

  const loadWatchlist = async () => {
    try {
      const stored = await AsyncStorage.getItem('watchlist');
      if (stored) {
        setWatchLater(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const getGenreNames = (genreIds) => {
    if (!genreIds || genreIds.length === 0) return 'Unknown';
    return genreIds.slice(0, 2).map(id => genreMap[id] || 'Unknown').join(' • ');
  };

  const searchMovies = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Search Required', 'Please enter a movie title');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=en-US`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setActiveTab('search');
      
      if (data.results.length === 0) {
        Alert.alert('No Results', 'No movies found matching your search');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Unable to fetch movies. Please check your connection.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchLater = (movie) => {
    const isAlreadySaved = watchLater.some(m => m.id === movie.id);
    
    if (isAlreadySaved) {
      Alert.alert('Already Added', 'This movie is already in your watchlist');
      return;
    }

    const movieWithDate = {
      ...movie,
      addedAt: new Date().toISOString()
    };

    setWatchLater([movieWithDate, ...watchLater]);
    Alert.alert('Added', 'Movie added to your watchlist');
  };

  const removeFromWatchLater = (movieId) => {
    Alert.alert(
      'Remove Movie',
      'Remove this movie from your watchlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setWatchLater(watchLater.filter(m => m.id !== movieId))
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
  };

  const getSortedWatchlist = () => {
    let sorted = [...watchLater];
    
    switch (sortBy) {
      case 'dateAdded':
        sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    if (selectedGenre !== 'all') {
      sorted = sorted.filter(movie => 
        movie.genre_ids && movie.genre_ids.includes(parseInt(selectedGenre))
      );
    }

    return sorted;
  };

  const HorizontalMovieCard = ({ movie, showAddButton = false, showRemoveButton = false }) => {
    const posterURL = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null;
    
    const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

    return (
      <View style={styles.horizontalCard}>
        <View style={styles.posterSection}>
          {posterURL ? (
            <Image source={{ uri: posterURL }} style={styles.horizontalPoster} />
          ) : (
            <View style={[styles.horizontalPoster, styles.noPoster]}>
              <Text style={styles.noPosterText}>No Image</Text>
            </View>
          )}
        </View>
        
        <View style={styles.horizontalInfo}>
          <View style={styles.horizontalContent}>
            <Text style={styles.horizontalTitle} numberOfLines={2}>{movie.title}</Text>
            <Text style={styles.horizontalYear}>{releaseYear}</Text>
            <Text style={styles.horizontalGenre} numberOfLines={1}>
              {getGenreNames(movie.genre_ids)}
            </Text>
            <View style={styles.horizontalRating}>
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          </View>
          
          {showAddButton && (
            <TouchableOpacity
              style={styles.horizontalAddButton}
              onPress={() => addToWatchLater(movie)}
              activeOpacity={0.8}
            >
              <Text style={styles.horizontalButtonText}>Add</Text>
            </TouchableOpacity>
          )}
          
          {showRemoveButton && (
            <TouchableOpacity
              style={styles.horizontalRemoveButton}
              onPress={() => removeFromWatchLater(movie.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.horizontalButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const EmptyState = ({ type }) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>
        {type === 'search' ? 'Discover Movies' : 'Your Watchlist is Empty'}
      </Text>
      <Text style={styles.emptyStateText}>
        {type === 'search' 
          ? 'Search for your favorite movies and add them to your watchlist'
          : 'Start adding movies you want to watch later'}
      </Text>
    </View>
  );

  const FilterBar = () => {
    const genres = [
      { id: 'all', name: 'All' },
      { id: '28', name: 'Action' },
      { id: '35', name: 'Comedy' },
      { id: '18', name: 'Drama' },
      { id: '27', name: 'Horror' },
      { id: '878', name: 'Sci-Fi' },
    ];

    return (
      <View style={styles.filterBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <View style={styles.sortSection}>
            <Text style={styles.filterLabel}>Sort:</Text>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'dateAdded' && styles.filterButtonActive]}
              onPress={() => setSortBy('dateAdded')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'dateAdded' && styles.filterButtonTextActive]}>
                Recent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'rating' && styles.filterButtonActive]}
              onPress={() => setSortBy('rating')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'rating' && styles.filterButtonTextActive]}>
                Rating
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'title' && styles.filterButtonActive]}
              onPress={() => setSortBy('title')}
            >
              <Text style={[styles.filterButtonText, sortBy === 'title' && styles.filterButtonTextActive]}>
                Title
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.genreSection}>
            <Text style={styles.filterLabel}>Genre:</Text>
            {genres.map(genre => (
              <TouchableOpacity
                key={genre.id}
                style={[styles.filterButton, selectedGenre === genre.id && styles.filterButtonActive]}
                onPress={() => setSelectedGenre(genre.id)}
              >
                <Text style={[styles.filterButtonText, selectedGenre === genre.id && styles.filterButtonTextActive]}>
                  {genre.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>WATCHLIST</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'watchlist' && styles.activeTab]}
            onPress={() => setActiveTab('watchlist')}
          >
            <Text style={[styles.tabText, activeTab === 'watchlist' && styles.activeTabText]}>
              My List ({watchLater.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for movies..."
              placeholderTextColor="#666"
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={searchMovies}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchMovies}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'watchlist' && watchLater.length > 0 && <FilterBar />}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#dc2626"
            colors={['#dc2626']}
          />
        }
      >
        {activeTab === 'search' && (
          <>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <HorizontalMovieCard movie={item} showAddButton={true} />
                )}
              />
            ) : (
              <EmptyState type="search" />
            )}
          </>
        )}

        {activeTab === 'watchlist' && (
          <>
            {watchLater.length > 0 ? (
              <FlatList
                data={getSortedWatchlist()}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <HorizontalMovieCard movie={item} showRemoveButton={true} />
                )}
              />
            ) : (
              <EmptyState type="watchlist" />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}