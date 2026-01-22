import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';

const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const ACCOLADES = ['admin', 'community_support', 'beta', 'staff', 'verified_athlete', 'founding_member'];

export default function UserManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedAccolade, setSelectedAccolade] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const loadUsers = async (page = 1, reset = false) => {
    try {
      const isPaginating = !reset && page > 1;
      if (reset) {
        setLoading(true);
      }
      if (isPaginating) {
        setLoadingMore(true);
      }
      // Build query string manually
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(selectedRegion && selectedRegion !== 'all' && { region: selectedRegion }),
        ...(selectedAccolade && selectedAccolade !== 'all' && { accolade: selectedAccolade }),
        sortBy,
        sortOrder,
      }).toString();

      const response = await api.get(`/api/admin/users?${queryParams}`);

      if (response?.success) {
        const newUsers = response.data.users;
        if (page === 1 || reset) {
          setUsers(newUsers);
        } else {
          setUsers(prev => [...prev, ...newUsers]);
        }
        setFilteredUsers(newUsers);
        setPagination(response.data.pagination);
        setTotalPages(response.data.pagination.pages);
        setCurrentPage(response.data.pagination.page);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      Alert.alert('Error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadUsers(1, true);
  }, [debouncedSearch, selectedRegion, selectedAccolade, sortBy, sortOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers(1, true);
  };

  const loadMore = () => {
    if (currentPage < totalPages && !loading && !loadingMore && !refreshing) {
      loadUsers(currentPage + 1, false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return 'chevron-expand';
    return sortOrder === 'asc' ? 'chevron-up' : 'chevron-down';
  };

  const UserItem = ({ user }) => {
    const isAdmin = user.accolades?.includes('admin');
    const isCommunitySupport = user.accolades?.includes('community_support');
    const hasAccolade = isAdmin || isCommunitySupport;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.navigate('AdminUserDetail', { userId: user.id })}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatarContainer}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatarPlaceholder, { backgroundColor: '#ff003c' }]}>
              <Text style={styles.userAvatarInitial}>
                {String(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {hasAccolade && (
            <View style={[styles.adminBadge, { backgroundColor: isAdmin ? '#ff003c' : '#ff9500' }]}>
              <Ionicons name={isAdmin ? 'shield' : 'star'} size={8} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{String(user.name || 'Unknown')}</Text>
            <View style={styles.userBadges}>
              {user.accolades?.map((accolade, index) => (
                <View key={index} style={styles.accoladeBadge}>
                  <Text style={styles.accoladeBadgeText}>{String(accolade)}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.userHandle}>@{String(user.username || 'unknown')}</Text>
          <View style={styles.userStats}>
            <Text style={styles.userStatItem}>{String(user.region || 'Global')}</Text>
            <Text style={styles.userStatSeparator}>•</Text>
            <Text style={styles.userStatItem}>{Number(user.totalPoints || 0)} XP</Text>
            <Text style={styles.userStatSeparator}>•</Text>
            <Text style={styles.userStatItem}>Rank {Number(user.rank || 99)}</Text>
          </View>
        </View>

        <View style={styles.userRight}>
          <Text style={styles.userPoints}>{Number(user.totalPoints || 0).toLocaleString()}</Text>
          <Text style={styles.userPointsLabel}>XP</Text>
          <Ionicons name="chevron-forward" size={16} color="#333" />
        </View>
      </TouchableOpacity>
    );
  };

  const FilterChip = ({ label, value, selected, onPress }) => (
    <TouchableOpacity
      style={[styles.filterChip, selected && styles.filterChipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>User Management</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, username, or email..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <Text style={styles.filterLabel}>Region:</Text>
        {['all', ...REGIONS].map(region => (
          <FilterChip
            key={region}
            label={region === 'all' ? 'All' : region}
            value={region}
            selected={selectedRegion === region}
            onPress={() => setSelectedRegion(region)}
          />
        ))}

        <Text style={styles.filterLabel}>Accolade:</Text>
        {['all', ...ACCOLADES].map(accolade => (
          <FilterChip
            key={accolade}
            label={accolade === 'all' ? 'All' : accolade}
            value={accolade}
            selected={selectedAccolade === accolade}
            onPress={() => setSelectedAccolade(accolade)}
          />
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { field: 'createdAt', label: 'Join Date' },
            { field: 'totalPoints', label: 'Points' },
            { field: 'weeklyPoints', label: 'Weekly XP' },
            { field: 'name', label: 'Name' },
            { field: 'rank', label: 'Rank' },
          ].map(option => (
            <TouchableOpacity
              key={option.field}
              style={[styles.sortOption, sortBy === option.field && styles.sortOptionSelected]}
              onPress={() => handleSort(option.field)}
            >
              <Text style={[styles.sortOptionText, sortBy === option.field && styles.sortOptionTextSelected]}>
                {option.label}
              </Text>
              <Ionicons
                name={getSortIcon(option.field)}
                size={14}
                color={sortBy === option.field ? '#ff003c' : '#888'}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ff003c" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={48} color="#333" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff003c" />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
            if (isCloseToBottom) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {pagination && (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                Showing {users.length} of {pagination.total} users
              </Text>
            </View>
          )}

          {users.map(user => (
            <UserItem key={user.id} user={user} />
          ))}

          {loading && users.length > 0 && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#ff003c" />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          )}

          {currentPage >= totalPages && users.length > 0 && (
            <View style={styles.endOfList}>
              <Text style={styles.endOfListText}>End of list</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginRight: 8,
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  filterChipSelected: {
    backgroundColor: '#ff003c',
    borderColor: '#ff003c',
  },
  filterChipText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginRight: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  sortOptionSelected: {
    backgroundColor: 'rgba(255, 0, 60, 0.2)',
    borderColor: '#ff003c',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginRight: 4,
  },
  sortOptionTextSelected: {
    color: '#ff003c',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  paginationInfo: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: '#888',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
  },
  userBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accoladeBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  accoladeBadgeText: {
    fontSize: 9,
    color: '#888',
    fontWeight: '600',
  },
  userHandle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userStatItem: {
    fontSize: 11,
    color: '#666',
  },
  userStatSeparator: {
    fontSize: 10,
    color: '#444',
    marginHorizontal: 6,
  },
  userRight: {
    alignItems: 'flex-end',
  },
  userPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff003c',
  },
  userPointsLabel: {
    fontSize: 10,
    color: '#888',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#888',
  },
  endOfList: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 12,
    color: '#666',
  },
});
