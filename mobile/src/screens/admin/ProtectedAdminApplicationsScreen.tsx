import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import type { RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { AdminApplicationsScreen as AdminScreenComponent } from './AdminApplicationsScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminApplications'>;

export function ProtectedAdminApplicationsScreen(props: Props) {
  const { navigation } = props;

  useEffect(() => {
    const checkAdminAccess = async () => {
      const user = await authService.getUser();
      if (!user || user.role !== 'ADMIN') {
        // Redirect to profile if not admin
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'TraineeRoot', params: { screen: 'Profile' } }],
          }),
        );
      }
    };

    checkAdminAccess();
  }, [navigation]);

  return <AdminScreenComponent {...props} />;
}
