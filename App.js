/**
 /**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [retrieveConnectedDevices, setRetrieveConnectedDevices] = useState([]);
  const peripherals = new Map();
  const [list, setList] = useState([]);

  const startScan = () => {
    if (!isScanning) {
      BleManager.scan([], 3, true)
        .then(results => {
          console.log('Сканирование...');
          setIsScanning(true);
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  const handleStopScan = () => {
    console.log('Сканирование остановлено');
    setIsScanning(false);
  };

  const handleDisconnectedPeripheral = data => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Отключен от ' + data.peripheral);
    Alert.alert('Отключен от ' + data.peripheral);
  };

  const handleUpdateValueForCharacteristic = data => {
    console.log(
      'Received data from ' +
        data.peripheral +
        ' characteristic ' +
        data.characteristic,
      data.value,
    );
  };

  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([])
      .then(results => {
        if (results.length == 0) {
          console.log('Нет подключенных устройств');
        }
        for (let i = 0; i < results.length; i++) {
          let peripheral = results[i];
          peripheral.connected = true;
          peripherals.set(peripheral.id, peripheral);
        }
        setRetrieveConnectedDevices(results);
      })
      .catch(error => {
        Alert.alert(error);
      });
  };

  const handleDiscoverPeripheral = peripheral => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'Имя не известно';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  };

  const testPeripheral = peripheral => {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id)
          .then(() => {
            console.log('disconnected');
            Alert.alert(`Отключен от ${peripheral.id}`);
          })
          .catch(error => Alert.alert(`Ошибка: ${error}`));
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            Alert.alert(`Подключен к ${peripheral.id}`);
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
            }
            console.log('Подключен к ' + peripheral.id);

            setTimeout(() => {
              /* Test read current RSSI value */
              BleManager.retrieveServices(peripheral.id).then(
                peripheralData => {
                  retrieveConnected();

                  BleManager.readRSSI(peripheral.id).then(rssi => {
                    console.log('Реальное значение RSSI: ', rssi);
                    let p = peripherals.get(peripheral.id);
                    if (p) {
                      p.rssi = rssi;
                      peripherals.set(peripheral.id, p);
                    }
                  });
                },
              );
            }, 900);
          })
          .catch(error => {
            console.log('Ошибка соединения', error);
            Alert.alert('Ошибка соединения', error);
          });
      }
    }
  };

  useEffect(() => {
    BleManager.start({showAlert: false}).then(() =>
      console.log('Bluetooth готов к использованию'),
    );

    let BleManagerDiscoverPeripheral = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );
    let BleManagerStopScan = bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    let BleManagerDisconnectPeripheral = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );
    let BleManagerDidUpdateValueForCharacteristic = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Доступ разрешен');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(result => {
            if (result) {
              console.log('Пользователь дал разрешение');
            } else {
              console.log('Пользователь не дал разрешение');
            }
          });
        }
      });
    }

    return () => {
      console.log('unmount');
      BleManagerDiscoverPeripheral.remove();
      // bleManagerEmitter.removeListener(
      //   'BleManagerDiscoverPeripheral',
      //   handleDiscoverPeripheral,
      // );
      BleManagerStopScan.remove();
      BleManagerDisconnectPeripheral.remove();
      BleManagerDidUpdateValueForCharacteristic.remove();
      // bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan);
      // bleManagerEmitter.removeListener(
      //   'BleManagerDisconnectPeripheral',
      //   handleDisconnectedPeripheral,
      // );
      // bleManagerEmitter.removeListener(
      //   'BleManagerDidUpdateValueForCharacteristic',
      //   handleUpdateValueForCharacteristic,
      // );
    };
  }, []);
  useEffect(() => {}, [retrieveConnectedDevices]);
  const renderItem = item => {
    const color = item.connected ? '#fff' : '#fff';
    return item.rssi > -80 ? (
      <TouchableHighlight>
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              textAlign: 'center',
              color: '#2c2fe7',
              padding: 10,
            }}>
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: 12,
              textAlign: 'center',
              color: '#333333',
              padding: 2,
            }}>
            <Text style={{fontWeight: '800'}}>RSSI</Text>: {item.rssi}
          </Text>
          <Text
            style={{
              fontSize: 12,
              textAlign: 'center',
              color: '#333333',
              padding: 2,
            }}>
            <Text style={{fontWeight: '800'}}>Device ID</Text>: {item.id}
          </Text>
          {modalVisible && item.advertising ? (
            <Text
              style={{
                fontSize: 12,
                textAlign: 'center',
                color: '#333333',
                padding: 2,
              }}>
              <Text style={{fontWeight: '800'}}>isConnectable</Text>:{' '}
              {item.advertising.isConnectable}
            </Text>
          ) : null}
          {modalVisible && item.advertising ? (
            <Text
              style={{
                fontSize: 12,
                textAlign: 'center',
                color: '#333333',
                padding: 2,
              }}>
              <Text style={{fontWeight: '800'}}>Other</Text>:{' '}
              {JSON.stringify(item.advertising)}
            </Text>
          ) : null}
          <View
            style={{
              display: 'flex',
              marginLeft: 10,
              marginRight: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            {modalVisible ? null : (
              <View
                style={{
                  borderRadius: 5,
                  borderColor: 'rgba(44,47,231,0.89)',
                  backgroundColor: '#2c2fe7',
                  borderWidth: 2,
                  marginTop: 15,
                }}>
                <Button
                  onPress={() => testPeripheral(item)}
                  title={'Подключиться'}
                  color={'#fff'}
                />
              </View>
            )}
            <View
              style={{
                borderRadius: 5,
                borderColor: 'rgba(220,39,39,0.89)',
                backgroundColor: '#dc2727',
                borderWidth: 2,
                marginTop: 15,
              }}>
              <Button
                onPress={() => {
                  BleManager.disconnect(item.id)
                    .then(() => {
                      // Alert.alert(`Отключен от: ${item.id}`);
                    })
                    .catch(error => Alert.alert('Ошибка:', error));
                }}
                title={'Отключиться'}
                color={'#fff'}
              />
            </View>
          </View>
        </View>
      </TouchableHighlight>
    ) : (
      ''
    );
  };

  return (
    <>
      {isScanning ? (
        <View
          style={{
            backgroundColor: 'transparent',
            width: '100%',
            minHeight: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text>
            {isScanning ? (
              <ActivityIndicator size="large" color="#2c2fe7" />
            ) : (
              ''
            )}
          </Text>
        </View>
      ) : (
        ''
      )}
      <StatusBar barStyle="light-content" />
      <SafeAreaView>
        {global.HermesInternal == null ? null : (
          <View style={styles.engine}>
            <Text style={styles.footer}>Engine: Hermes</Text>
          </View>
        )}
        <View style={styles.body}>
          <View
            style={{
              margin: 10,
              backgroundColor: '#2c2fe7',
              borderRadius: 5,
              border: '5px solid rgba(0, 0, 0, 100)',
            }}>
            <Button
              title={'Сканировать устройства'}
              color="#fff"
              onPress={() => startScan()}
            />
          </View>

          <View
            style={{
              margin: 10,
              backgroundColor: '#2c2fe7',
              borderRadius: 5,
              border: '5px solid rgba(0, 0, 0, 100)',
            }}>
            <Button
              title="Получить подключенные устройства"
              color="#fff"
              onPress={() => {
                setModalVisible(true);
                retrieveConnected();
              }}
            />
          </View>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={styles.scrollView}>
            <View style={styles.centeredView}>
              <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                  setModalVisible(!modalVisible);
                }}>
                <View style={styles.modalView}>
                  {retrieveConnectedDevices.length > 0 ? (
                    <FlatList
                      data={retrieveConnectedDevices}
                      renderItem={({item}) => renderItem(item)}
                      keyExtractor={item => item.id}
                    />
                  ) : (
                    <Text style={{fontSize: 16, fontWeight: '800'}}>
                      Нет подключенных устройств
                    </Text>
                  )}
                  <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => setModalVisible(!modalVisible)}>
                    <Text style={styles.textStyle}>Закрыть</Text>
                  </Pressable>
                </View>
              </Modal>
            </View>

            {list.length == 0 && (
              <View style={{flex: 1, margin: 20}}>
                <Text style={{textAlign: 'center'}}>Нет устройств</Text>
              </View>
            )}
          </ScrollView>
        </View>
        {!modalVisible ? (
          <FlatList
            style={{marginBottom: 120}}
            data={list}
            renderItem={({item}) => renderItem(item)}
            keyExtractor={item => item.id}
          />
        ) : null}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    width: '100%',
    height: '100%',
  },
  modalView: {
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    marginLeft: 10,
    marginRight: 10,
    marginTop: 22,
    height: '96%',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 5,
    padding: 10,
    width: '100%',
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2c2fe7',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'start',
  },
  scrollView: {
    backgroundColor: Colors.white,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
