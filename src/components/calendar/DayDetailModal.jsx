import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatDisplayDate,
  calculateDayStats,
  getMoodEmoji,
} from '../../utils/calendarHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * DayDetailModal - Modal showing details for a selected day
 */
const DayDetailModal = ({
  visible,
  date,
  dayData,
  onClose,
  onAddPB,
  onEditReflection,
}) => {
  const insets = useSafeAreaInsets();

  if (!date || !dayData) {
    return null;
  }

  const stats = calculateDayStats(dayData.logs);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerDate}>{formatDisplayDate(date).toUpperCase()}</Text>
              <Text style={styles.headerSubtitle}>
                {dayData.logs.length} EXERCISES • {stats.totalVolume.toLocaleString()} KG VOL
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Reflection Section */}
            {(dayData.mood || dayData.energyLevel || dayData.notes) ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>REFLECTION</Text>
                  {onEditReflection && (
                    <TouchableOpacity onPress={onEditReflection}>
                      <Text style={styles.editLink}>EDIT</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.reflectionCard}>
                  <View style={styles.reflectionStats}>
                    {dayData.mood && (
                      <View style={styles.moodItem}>
                        <Text style={styles.moodEmoji}>{getMoodEmoji(dayData.mood)}</Text>
                        <Text style={styles.moodLabel}>{dayData.mood.toUpperCase()}</Text>
                      </View>
                    )}
                    {dayData.mood && dayData.energyLevel && <View style={styles.statDivider} />}
                    {dayData.energyLevel && (
                      <View style={styles.moodItem}>
                        <Text style={[styles.moodEmoji, { fontSize: 18, fontWeight: '800', color: '#fff' }]}>
                          {dayData.energyLevel}
                        </Text>
                        <Text style={styles.moodLabel}>ENERGY</Text>
                      </View>
                    )}
                  </View>
                  
                  {dayData.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{dayData.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                 {onEditReflection && (
                  <TouchableOpacity
                    style={styles.addReflectionButton}
                    onPress={onEditReflection}
                  >
                    <View style={styles.addReflectionIcon}>
                      <Ionicons name="add" size={20} color="#9b2c2c" />
                    </View>
                    <View>
                      <Text style={styles.addReflectionTitle}>Add Reflection</Text>
                      <Text style={styles.addReflectionSubtitle}>Track mood, energy & notes</Text>
                    </View>
                  </TouchableOpacity>
                 )}
              </View>
            )}

            {/* Exercises Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WORKOUTS</Text>
              {dayData.logs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No workouts recorded for this day.</Text>
                </View>
              ) : (
                dayData.logs.map((log, index) => (
                  <View key={log.id || index} style={styles.exerciseCard}>
                    <View style={styles.cardMain}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName}>{log.exercise}</Text>
                        <Text style={styles.exerciseStats}>
                          {log.weight || 0}<Text style={styles.unit}>kg</Text> × {log.reps || 0}<Text style={styles.unit}>reps</Text>
                        </Text>
                      </View>
                      
                      {log.isPB ? (
                        <View style={styles.pbBadge}>
                          <Ionicons name="trophy" size={12} color="#ffd700" />
                          <Text style={styles.pbText}>PB</Text>
                        </View>
                      ) : (
                        onAddPB && (
                          <TouchableOpacity
                            style={styles.ghostPbBtn}
                            onPress={() => onAddPB(log)}
                          >
                            <Ionicons name="trophy-outline" size={16} color="#444" />
                          </TouchableOpacity>
                        )
                      )}
                    </View>

                    {log.isPB && log.pbNote && (
                      <View style={styles.pbNoteContainer}>
                        <Text style={styles.pbNoteText}>"{log.pbNote}"</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0a0a0a', // bgPanel
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDate: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  editLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9b2c2c',
    letterSpacing: 0.5,
  },
  
  // Reflection Styles
  reflectionCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reflectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  moodItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Add Reflection Button
  addReflectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 44, 44, 0.08)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 44, 44, 0.2)',
    borderStyle: 'dashed',
  },
  addReflectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(155, 44, 44, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addReflectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  addReflectionSubtitle: {
    fontSize: 12,
    color: '#888',
  },

  // Exercise Cards
  exerciseCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  exerciseStats: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
  unit: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  pbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  pbText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffd700',
  },
  ghostPbBtn: {
    padding: 8,
    opacity: 0.5,
  },
  pbNoteContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  pbNoteText: {
    fontSize: 12,
    color: '#d4af37',
    fontStyle: 'italic',
  },
  
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DayDetailModal;
