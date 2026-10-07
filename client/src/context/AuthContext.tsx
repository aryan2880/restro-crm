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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurantState] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setRestaurantState(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get<{ user: User; restaurant: Restaurant }>('/auth/me');
      setUser(data.user);
      setRestaurantState(data.restaurant);

      if (data.restaurant?.id) {
        joinRestaurantRoom(data.restaurant.id);
      }
    } catch (err) {
      console.error('Failed to fetch auth profile:', err);
      removeAuthToken();
      setUser(null);
      setRestaurantState(null);
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

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setRestaurantState(null);
    window.location.href = '/login';
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
