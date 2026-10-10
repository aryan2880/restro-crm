import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Restaurant } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../utils/api';
import { joinRestaurantRoom } from '../utils/socket';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  isLoading: boolean;
  login: (token: string, user: User, restaurant?: Restaurant) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setRestaurant: (restaurant: Restaurant) => void;
  quickSwitch: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurantState] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const data = await api.get<{ user: User; restaurant: Restaurant }>('/auth/me');
        setUser(data.user);
        setRestaurantState(data.restaurant);

        if (data.restaurant?.id) {
          joinRestaurantRoom(data.restaurant.id);
        }
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('Existing token invalid, logging in default account...', err);
        removeAuthToken();
      }
    }

    // Direct passwordless auto-login so the user never sees a login barrier
    try {
      const data = await api.post<{ token: string; user: User; restaurant: Restaurant }>('/auth/quick-login', {
        email: 'owner@grandbistro.com',
      });
      setAuthToken(data.token);
      setUser(data.user);
      setRestaurantState(data.restaurant);

      if (data.restaurant?.id) {
        joinRestaurantRoom(data.restaurant.id);
      }
    } catch (err) {
      console.error('Failed passwordless auto-login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = (token: string, newUser: User, newRestaurant?: Restaurant) => {
    setAuthToken(token);
    setUser(newUser);
    if (newRestaurant) {
      setRestaurantState(newRestaurant);
      joinRestaurantRoom(newRestaurant.id);
    }
  };

  const quickSwitch = async (email: string) => {
    try {
      setIsLoading(true);
      const data = await api.post<{ token: string; user: User; restaurant: Restaurant }>('/auth/quick-login', { email });
      setAuthToken(data.token);
      setUser(data.user);
      setRestaurantState(data.restaurant || null);
      if (data.restaurant?.id) {
        joinRestaurantRoom(data.restaurant.id);
      }
    } catch (err) {
      console.error('Failed to quick switch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Reset to default owner without logging out to a blocked screen
    quickSwitch('owner@grandbistro.com');
  };

  const setRestaurant = (updated: Restaurant) => {
    setRestaurantState(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        isLoading,
        login,
        logout,
        refreshProfile: fetchProfile,
        setRestaurant,
        quickSwitch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
