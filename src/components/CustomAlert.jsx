import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ICON_CONFIG = {
  success: { name: 'checkmark-circle', color: '#00d4aa' },
  error: { name: 'alert-circle', color: '#ff003c' },
  warning: { name: 'warning', color: '#eab308' },
  info: { name: 'information-circle', color: '#3b82f6' },
};

/**
 * CustomAlert - A styled modal replacement for Alert.alert
 *
 * @param {boolean} visible - Whether the alert is visible
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Array} buttons - Array of button configs: { text, style, onPress }
 *   - style: 'default' | 'cancel' | 'destructive'
 * @param {string} icon - Icon type: 'success' | 'error' | 'warning' | 'info' | null
 * @param {function} onClose - Called when alert is dismissed
 */
const CustomAlert = ({
  visible = false,
  title = '',
  message = '',
  buttons = [{ text: 'OK', style: 'default' }],
  icon = null,
  onClose = () => {},
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonStyle = (style) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButtonText;
      case 'cancel':
        return styles.cancelButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  const iconConfig = icon ? ICON_CONFIG[icon] : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {iconConfig && (
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconConfig.name}
                size={48}
                color={iconConfig.color}
              />
            </View>
          )}

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length > 1 && index === 0 && styles.buttonMarginRight,
                ]}
                onPress={() => handleButtonPress(button)}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Helper hook for managing alert state
 *
 * Usage:
 * const { alertConfig, showAlert, hideAlert } = useCustomAlert();
 *
 * showAlert({
 *   title: 'Error',
 *   message: 'Something went wrong',
 *   icon: 'error',
 *   buttons: [{ text: 'OK', style: 'default' }]
 * });
 *
 * <CustomAlert {...alertConfig} onClose={hideAlert} />
 */
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK', style: 'default' }],
    icon: null,
  });

  const showAlert = (config) => {
    setAlertConfig({
      visible: true,
      title: config.title || '',
      message: config.message || '',
      buttons: config.buttons || [{ text: 'OK', style: 'default' }],
      icon: config.icon || null,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  return { alertConfig, showAlert, hideAlert };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: Math.min(SCREEN_WIDTH - 48, 320),
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonMarginRight: {
    marginRight: 12,
  },
  defaultButton: {
    backgroundColor: '#9b2c2c',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666666',
  },
  destructiveButton: {
    backgroundColor: '#ff003c',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#ffffff',
  },
  cancelButtonText: {
    color: '#888888',
  },
  destructiveButtonText: {
    color: '#ffffff',
  },
});

export default CustomAlert;
