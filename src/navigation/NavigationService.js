import { CommonActions } from '@react-navigation/native';

// Simple navigation store
let _navigation = null;

export const NavigationService = {
  setTopLevelNavigator(navigator) {
    console.log('NavigationService: Setting navigator', navigator ? 'SUCCESS' : 'NULL');
    _navigation = navigator;
  },

  navigateToWelcome() {
    console.log('NavigationService: navigateToWelcome called, _navigation is', _navigation ? 'SET' : 'NULL');
    if (_navigation) {
      console.log('NavigationService: Dispatching reset to Welcome...');
      _navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
      console.log('NavigationService: Dispatch complete');
    } else {
      console.error('NavigationService: navigator not set - cannot navigate');
    }
  },

  get navigator() {
    return _navigation;
  }
};

// Export standalone function for direct import
export const navigateToWelcome = () => NavigationService.navigateToWelcome();
