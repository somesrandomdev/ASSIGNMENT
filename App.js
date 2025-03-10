import React, { useState, useEffect } from 'react';
import { Button, FlatList, Text, TextInput, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();
const BOOKS_KEY = 'books';
const LAST_BOOK_KEY = 'lastBook';

// Helper functions to read/write books from AsyncStorage
async function getBooks() {
  try {
    const booksStr = await AsyncStorage.getItem(BOOKS_KEY);
    return booksStr ? JSON.parse(booksStr) : [];
  } catch (e) {
    console.error("Error getting books:", e);
    return [];
  }
}

async function saveBooks(books) {
  try {
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch (e) {
    console.error("Error saving books:", e);
  }
}

// Home Screen: Shows the last opened book or a placeholder message.
function HomeScreen({ navigation }) {
  const [lastBook, setLastBook] = useState(null);

  useEffect(() => {
    const fetchLastBook = async () => {
      try {
        const lastBookId = await AsyncStorage.getItem(LAST_BOOK_KEY);
        if (lastBookId) {
          const books = await getBooks();
          const book = books.find(b => String(b.id) === lastBookId);
          if (book) setLastBook(book);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLastBook();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personal Library (Web)</Text>
      {lastBook ? (
        <View style={styles.lastBookContainer}>
          <Text>Last opened book:</Text>
          <Text style={styles.bookTitle}>{lastBook.title}</Text>
          <Button
            title="View Details"
            onPress={() => navigation.navigate('BookDetails', { book: lastBook })}
          />
        </View>
      ) : (
        <Text>No book opened yet.</Text>
      )}
      <Button title="Go to Book List" onPress={() => navigation.navigate('BookList')} />
    </View>
  );
}

// Book List Screen: Displays all books from AsyncStorage and allows navigation to details.
function BookListScreen({ navigation }) {
  const [books, setBooks] = useState([]);

  const fetchBooks = async () => {
    const booksArray = await getBooks();
    setBooks(booksArray);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchBooks);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={async () => {
        try {
          await AsyncStorage.setItem(LAST_BOOK_KEY, String(item.id));
          navigation.navigate('BookDetails', { book: item });
        } catch (e) {
          console.error(e);
        }
      }}
    >
      <Text style={styles.bookTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {books.length === 0 ? <Text>No books available.</Text> : null}
      <FlatList 
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
      <Button title="Add Book" onPress={() => navigation.navigate('AddEditBook')} />
    </View>
  );
}

// Book Details Screen: Displays details of the selected book with edit and delete options.
function BookDetailsScreen({ route, navigation }) {
  const { book } = route.params;

  const deleteBook = async (id) => {
    try {
      const books = await getBooks();
      const updatedBooks = books.filter(b => b.id !== id);
      await saveBooks(updatedBooks);
      navigation.goBack();
    } catch (e) {
      console.error("Error deleting book:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{book.title}</Text>
      <Text>Author: {book.author}</Text>
      <Text>Status: {book.status}</Text>
      <Button title="Edit Book" onPress={() => navigation.navigate('AddEditBook', { book })} />
      <Button title="Delete Book" onPress={() => {
        Alert.alert(
          "Delete Book",
          "Are you sure you want to delete this book?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", onPress: () => deleteBook(book.id), style: "destructive" }
          ]
        );
      }} />
    </View>
  );
}

// Add/Edit Book Screen: A form to add a new book or edit an existing one.
function AddEditBookScreen({ route, navigation }) {
  const editing = route.params && route.params.book;
  const [title, setTitle] = useState(editing ? route.params.book.title : '');
  const [author, setAuthor] = useState(editing ? route.params.book.author : '');
  const [status, setStatus] = useState(editing ? route.params.book.status : '');

  const saveBook = async () => {
    if (title.trim() === '' || author.trim() === '' || status.trim() === '') {
      alert('Please fill out all fields.');
      return;
    }
    const books = await getBooks();
    if (editing) {
      const updatedBooks = books.map(b => {
        if (b.id === route.params.book.id) {
          return { ...b, title, author, status };
        }
        return b;
      });
      await saveBooks(updatedBooks);
    } else {
      const newBook = { id: Date.now(), title, author, status };
      await saveBooks([...books, newBook]);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Author"
        value={author}
        onChangeText={setAuthor}
      />
      <TextInput
        style={styles.input}
        placeholder="Status"
        value={status}
        onChangeText={setStatus}
      />
      <Button title="Save Book" onPress={saveBook} />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="BookList" component={BookListScreen} />
        <Stack.Screen name="BookDetails" component={BookDetailsScreen} />
        <Stack.Screen name="AddEditBook" component={AddEditBookScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 24, 
    marginBottom: 20 
  },
  bookTitle: { 
    fontSize: 18, 
    marginBottom: 10 
  },
  item: { 
    padding: 10, 
    borderBottomWidth: 1, 
    borderColor: '#ccc',
    width: '100%'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    marginBottom: 10, 
    padding: 8, 
    width: '100%'
  },
  lastBookContainer: {
    marginBottom: 20,
    alignItems: 'center'
  }
});
