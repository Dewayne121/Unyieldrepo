import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import CustomAlert, { useCustomAlert } from '../../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import {
  ADMIN_COLORS,
  ADMIN_SPACING,
  ADMIN_RADIUS,
  ADMIN_TYPOGRAPHY,
  ADMIN_SHADOWS,
  ADMIN_SURFACES,
} from '../../constants/adminTheme';

const REGIONS = ['Global', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
const ACCOLADES = ['admin', 'community_support', 'beta', 'staff', 'verified_athlete', 'founding_member', 'challenge_master'];

// Accolade display labels
const ACCOLADE_LABELS = {
  admin: 'ADMIN',
  community_support: 'SUPPORT',
  beta: 'BETA TESTER',
  staff: 'STAFF',
  verified_athlete: 'VERIFIED ATHLETE',
  founding_member: 'FOUNDER',
  challenge_master: 'CHALLENGE MASTER',
};

const getAccoladeLabel = (accolade) => ACCOLADE_LABELS[accolade] || accolade.replace('_', ' ').toUpperCase();

export default function UserManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
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
      showAlert({
        title: 'Error',
        message: err.message || 'Failed to load users',
        icon: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
                <View key={`${accolade}-${index}`} style={styles.accoladeBadge}>
                  <Text style={styles.accoladeBadgeText}>{getAccoladeLabel(accolade)}</Text>
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
        <Text style={styles.filterLabel}>Region</Text>
        {['all', ...REGIONS].map(region => (
          <FilterChip
            key={region}
            label={region === 'all' ? 'All' : region}
            value={region}
            selected={selectedRegion === region}
            onPress={() => setSelectedRegion(region)}
          />
        ))}

        <View style={styles.filterDivider} />
        <Text style={styles.filterLabel}>Accolade</Text>
        {['all', ...ACCOLADES].map(accolade => (
          <FilterChip
            key={accolade}
            label={accolade === 'all' ? 'All' : getAccoladeLabel(accolade)}
            value={accolade}
            selected={selectedAccolade === accolade}
            onPress={() => setSelectedAccolade(accolade)}
          />
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort</Text>
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

      {/* Custom Alert */}
      <CustomAlert {...alertConfig} onClose={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: ADMIN_SURFACES.page,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.xl,
    paddingBottom: ADMIN_SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ADMIN_COLORS.border,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ADMIN_COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ADMIN_SPACING.md,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  pageTitle: {
    ...ADMIN_TYPOGRAPHY.h2,
    flex: 1,
  },
  headerRight: {
    width: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.panel,
    marginHorizontal: ADMIN_SPACING.xl,
    marginTop: ADMIN_SPACING.md,
    marginBottom: ADMIN_SPACING.sm,
    paddingHorizontal: ADMIN_SPACING.md,
    borderRadius: ADMIN_RADIUS.md,
    height: 42,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: ADMIN_COLORS.text,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  filtersScroll: {
    marginBottom: ADMIN_SPACING.sm,
  },
  filtersContent: {
    paddingHorizontal: ADMIN_SPACING.xl,
    alignItems: 'center',
  },
  filterLabel: {
    ...ADMIN_TYPOGRAPHY.caption,
    marginRight: 8,
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: ADMIN_COLORS.borderSoft,
    marginHorizontal: ADMIN_SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: ADMIN_COLORS.card,
    borderRadius: ADMIN_RADIUS.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: {
    backgroundColor: ADMIN_COLORS.accentSoft,
    borderColor: ADMIN_COLORS.accent,
  },
  filterChipText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
  },
  filterChipTextSelected: {
    color: ADMIN_COLORS.accent,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.xl,
    paddingTop: ADMIN_SPACING.xs,
    paddingBottom: ADMIN_SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ADMIN_COLORS.border,
  },
  sortLabel: {
    ...ADMIN_TYPOGRAPHY.caption,
    marginRight: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: ADMIN_COLORS.panel,
    borderRadius: ADMIN_RADIUS.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    minHeight: 24,
  },
  sortOptionSelected: {
    backgroundColor: ADMIN_COLORS.accentSoft,
    borderColor: ADMIN_COLORS.accent,
  },
  sortOptionText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '600',
    marginRight: 4,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
  },
  sortOptionTextSelected: {
    color: ADMIN_COLORS.accent,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ADMIN_SPACING.xl,
  },
  loadingText: {
    marginTop: ADMIN_SPACING.md,
    ...ADMIN_TYPOGRAPHY.bodyMuted,
  },
  emptyText: {
    marginTop: ADMIN_SPACING.md,
    ...ADMIN_TYPOGRAPHY.h2,
  },
  emptySubtext: {
    marginTop: ADMIN_SPACING.sm,
    ...ADMIN_TYPOGRAPHY.bodyMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ADMIN_SPACING.xl,
    paddingBottom: ADMIN_SPACING.xxl,
  },
  paginationInfo: {
    paddingVertical: ADMIN_SPACING.sm,
    alignItems: 'center',
  },
  paginationText: {
    ...ADMIN_TYPOGRAPHY.bodyMuted,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.card,
    borderRadius: ADMIN_RADIUS.lg,
    padding: ADMIN_SPACING.md,
    marginBottom: ADMIN_SPACING.md,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    ...ADMIN_SHADOWS.soft,
  },
  userAvatarContainer: {
    marginRight: ADMIN_SPACING.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.accent,
  },
  userAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.white,
    fontFamily: ADMIN_TYPOGRAPHY.title.fontFamily,
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ADMIN_COLORS.card,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.text,
    marginRight: 6,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
  },
  userBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accoladeBadge: {
    backgroundColor: ADMIN_COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSoft,
  },
  accoladeBadgeText: {
    fontSize: 8,
    color: ADMIN_COLORS.textSubtle,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  userHandle: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    marginBottom: 4,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userStatItem: {
    fontSize: 10,
    color: ADMIN_COLORS.textSubtle,
    fontWeight: '600',
  },
  userStatSeparator: {
    fontSize: 10,
    color: ADMIN_COLORS.textSubtle,
    marginHorizontal: 6,
  },
  userRight: {
    alignItems: 'flex-end',
    marginLeft: ADMIN_SPACING.sm,
  },
  userPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.accent,
    fontFamily: ADMIN_TYPOGRAPHY.body.fontFamily,
  },
  userPointsLabel: {
    fontSize: 9,
    color: ADMIN_COLORS.textSubtle,
    letterSpacing: 1,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ADMIN_SPACING.lg,
  },
  loadingMoreText: {
    marginLeft: ADMIN_SPACING.sm,
    ...ADMIN_TYPOGRAPHY.bodyMuted,
  },
  endOfList: {
    paddingVertical: ADMIN_SPACING.lg,
    alignItems: 'center',
  },
  endOfListText: {
    ...ADMIN_TYPOGRAPHY.caption,
  },
});
