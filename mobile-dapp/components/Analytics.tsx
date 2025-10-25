import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

interface AnalyticsProps {
  userAddress: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ userAddress }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState({
    totalValueLocked: 1250000,
    totalUsers: 1250,
    totalTransactions: 15600,
    averageAPY: 12.5,
    protocolRevenue: 45000,
    userPortfolio: {
      staked: 1000,
      liquidity: 500,
      farming: 750,
      total: 2250,
    },
    performanceMetrics: {
      dailyReturn: 2.5,
      weeklyReturn: 18.2,
      monthlyReturn: 45.8,
      totalReturn: 125.6,
    },
  });

  const timeframes = ['24h', '7d', '30d', '90d', '1y'];

  const renderMetricCard = (title: string, value: string, subtitle?: string, color = '#00F7FF') => (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPortfolioBreakdown = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Breakdown</Text>
      <View style={styles.portfolioItem}>
        <Text style={styles.portfolioLabel}>Staked</Text>
        <Text style={styles.portfolioValue}>{analyticsData.userPortfolio.staked} DPT</Text>
        <Text style={styles.portfolioPercentage}>
          {((analyticsData.userPortfolio.staked / analyticsData.userPortfolio.total) * 100).toFixed(1)}%
        </Text>
      </View>
      <View style={styles.portfolioItem}>
        <Text style={styles.portfolioLabel}>Liquidity</Text>
        <Text style={styles.portfolioValue}>{analyticsData.userPortfolio.liquidity} DPT</Text>
        <Text style={styles.portfolioPercentage}>
          {((analyticsData.userPortfolio.liquidity / analyticsData.userPortfolio.total) * 100).toFixed(1)}%
        </Text>
      </View>
      <View style={styles.portfolioItem}>
        <Text style={styles.portfolioLabel}>Farming</Text>
        <Text style={styles.portfolioValue}>{analyticsData.userPortfolio.farming} DPT</Text>
        <Text style={styles.portfolioPercentage}>
          {((analyticsData.userPortfolio.farming / analyticsData.userPortfolio.total) * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );

  const renderPerformanceMetrics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Metrics</Text>
      <View style={styles.performanceGrid}>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Daily</Text>
          <Text style={[styles.performanceValue, { color: '#4ecdc4' }]}>
            +{analyticsData.performanceMetrics.dailyReturn}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Weekly</Text>
          <Text style={[styles.performanceValue, { color: '#4ecdc4' }]}>
            +{analyticsData.performanceMetrics.weeklyReturn}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Monthly</Text>
          <Text style={[styles.performanceValue, { color: '#4ecdc4' }]}>
            +{analyticsData.performanceMetrics.monthlyReturn}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Total</Text>
          <Text style={[styles.performanceValue, { color: '#4ecdc4' }]}>
            +{analyticsData.performanceMetrics.totalReturn}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderProtocolStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Protocol Statistics</Text>
      <View style={styles.statsGrid}>
        {renderMetricCard(
          'Total Value Locked',
          `$${analyticsData.totalValueLocked.toLocaleString()}`,
          'Across all pools'
        )}
        {renderMetricCard(
          'Total Users',
          analyticsData.totalUsers.toLocaleString(),
          'Active participants'
        )}
        {renderMetricCard(
          'Total Transactions',
          analyticsData.totalTransactions.toLocaleString(),
          'All time'
        )}
        {renderMetricCard(
          'Average APY',
          `${analyticsData.averageAPY}%`,
          'Weighted average'
        )}
        {renderMetricCard(
          'Protocol Revenue',
          `$${analyticsData.protocolRevenue.toLocaleString()}`,
          'Last 30 days'
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Analytics Dashboard</Text>
      
      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            style={[
              styles.timeframeButton,
              selectedTimeframe === timeframe && styles.timeframeButtonActive,
            ]}
            onPress={() => setSelectedTimeframe(timeframe)}
          >
            <Text
              style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.timeframeTextActive,
              ]}
            >
              {timeframe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User Portfolio */}
      {renderPortfolioBreakdown()}

      {/* Performance Metrics */}
      {renderPerformanceMetrics()}

      {/* Protocol Statistics */}
      {renderProtocolStats()}

      {/* Additional Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Market Analysis</Text>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>DPT Price</Text>
          <Text style={styles.marketValue}>$2.45</Text>
          <Text style={[styles.marketChange, { color: '#4ecdc4' }]}>+5.2%</Text>
        </View>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>Market Cap</Text>
          <Text style={styles.marketValue}>$24.5M</Text>
          <Text style={[styles.marketChange, { color: '#4ecdc4' }]}>+8.1%</Text>
        </View>
        <View style={styles.marketItem}>
          <Text style={styles.marketLabel}>Trading Volume</Text>
          <Text style={styles.marketValue}>$1.2M</Text>
          <Text style={[styles.marketChange, { color: '#ff6b6b' }]}>-2.3%</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 5,
    marginBottom: 20,
  },
  timeframeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#00F7FF',
  },
  timeframeText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  metricCard: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  metricTitle: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  portfolioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  portfolioLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  portfolioValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00F7FF',
  },
  portfolioPercentage: {
    fontSize: 14,
    color: '#cccccc',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceItem: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 5,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  marketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  marketLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  marketValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00F7FF',
  },
  marketChange: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

