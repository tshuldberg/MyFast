import { View, Text, StyleSheet } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>No fasts recorded yet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#F5F2F8',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9B92A8',
    fontSize: 16,
    marginTop: 8,
  },
});
