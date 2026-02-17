import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SortButton = ({ sortOption, onPress }) => {
  const { theme } = useTheme();

  const getIcon = () => {
    switch (sortOption) {
      case 'date-asc': return 'funnel';
      case 'exercise': return 'text-outline';
      case 'volume-desc': return 'barbell-outline';
      default: return 'funnel-outline';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={16} color="#888" />
    </TouchableOpacity>
  );
};

export default SortButton;
