import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Web3Provider } from './providers/Web3Provider';
import { WalletConnect } from './components/WalletConnect';
import { TokenBalance } from './components/TokenBalance';
import { StakingInterface } from './components/StakingInterface';
import { LiquidityPool } from './components/LiquidityPool';
import { YieldFarming } from './components/YieldFarming';
import { Governance } from './components/Governance';
import { Analytics } from './components/Analytics';

const { width, height } = Dimensions.get('window');

interface DeFiAppProps {
  // Props for the main DeFi app
}

export const DeFiApp: React.FC<DeFiAppProps> = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'liquidity', label: 'Liquidity', icon: '💧' },
    { id: 'farming', label: 'Farming', icon: '🌾' },
    { id: 'governance', label: 'DAO', icon: '🗳️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  const handleWalletConnect = (address: string) => {
    setUserAddress(address);
    setIsConnected(true);
  };

  const handleWalletDisconnect = () => {
    setUserAddress('');
    setIsConnected(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>DeFi Protocol Dashboard</Text>
            <TokenBalance userAddress={userAddress} />
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>$1,234.56</Text>
                <Text style={styles.statLabel}>Total Value Locked</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>12.5%</Text>
                <Text style={styles.statLabel}>APY</Text>
              </View>
            </View>
          </View>
        );
      case 'staking':
        return <StakingInterface userAddress={userAddress} />;
      case 'liquidity':
        return <LiquidityPool userAddress={userAddress} />;
      case 'farming':
        return <YieldFarming userAddress={userAddress} />;
      case 'governance':
        return <Governance userAddress={userAddress} />;
      case 'analytics':
        return <Analytics userAddress={userAddress} />;
      default:
        return null;
    }
  };

  return (
    <Web3Provider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DeFi Protocol</Text>
          <WalletConnect
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
            isConnected={isConnected}
            userAddress={userAddress}
          />
        </View>

        {/* Main Content */}
        <ScrollView style={styles.mainContent}>
          {isConnected ? (
            renderTabContent()
          ) : (
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Welcome to DeFi Protocol</Text>
              <Text style={styles.welcomeSubtitle}>
                Connect your wallet to start earning with DeFi
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => Alert.alert('Connect Wallet', 'Wallet connection required')}
              >
                <Text style={styles.connectButtonText}>Connect Wallet</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.navItem,
                activeTab === tab.id && styles.navItemActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.navLabel,
                  activeTab === tab.id && styles.navLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Web3Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#16213e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00F7FF',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00F7FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#cccccc',
    marginTop: 5,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  connectButton: {
    backgroundColor: '#00F7FF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  connectButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: '#00F7FF',
    borderRadius: 10,
    marginHorizontal: 2,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#cccccc',
  },
  navLabelActive: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
});

export default DeFiApp;

