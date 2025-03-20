import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const bubbleSize = 70;
const maxBubbles = 15;
const boardSize = 4; // 4x4 grid for Memory Game

const GamesScreen = ({ navigateTo }) => {
  const [activeGame, setActiveGame] = useState(null); // null, 'bubblePop', 'memoryGame'
  
  // Return to game selection
  const backToGames = () => {
    setActiveGame(null);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF9800', '#E65100']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => activeGame ? backToGames() : navigateTo('dashboard')}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {activeGame === 'bubblePop' ? 'Bubble Pop' : 
             activeGame === 'memoryGame' ? 'Memory Match' : 
             'Stress Relief Games'}
          </Text>
        </View>
      </LinearGradient>
      
      {!activeGame ? (
        <GameSelection setActiveGame={setActiveGame} />
      ) : activeGame === 'bubblePop' ? (
        <BubblePopGame />
      ) : (
        <MemoryGame />
      )}
    </SafeAreaView>
  );
};

// Game Selection Screen
const GameSelection = ({ setActiveGame }) => {
  return (
    <View style={styles.gameSelectionContainer}>
      <Text style={styles.selectionTitle}>Choose a Game</Text>
      <Text style={styles.selectionSubtitle}>
        Taking short breaks to play these games can help reduce stress and improve focus
      </Text>
      
      <TouchableOpacity
        style={styles.gameOption}
        onPress={() => setActiveGame('bubblePop')}
      >
        <LinearGradient
          colors={['#FF9800', '#F57C00']}
          style={styles.gameOptionGradient}
          borderRadius={16}
        >
          <View style={styles.gameIconContainer}>
            <Text style={styles.gameIcon}>🫧</Text>
          </View>
          <View style={styles.gameTextContainer}>
            <Text style={styles.gameTitle}>Bubble Pop</Text>
            <Text style={styles.gameDescription}>
              Pop colorful bubbles to release tension and practice mindfulness. 
              The more bubbles you pop, the more relaxed you'll feel.
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.gameOption}
        onPress={() => setActiveGame('memoryGame')}
      >
        <LinearGradient
          colors={['#9C27B0', '#7B1FA2']}
          style={styles.gameOptionGradient}
          borderRadius={16}
        >
          <View style={styles.gameIconContainer}>
            <Text style={styles.gameIcon}>🧠</Text>
          </View>
          <View style={styles.gameTextContainer}>
            <Text style={styles.gameTitle}>Memory Match</Text>
            <Text style={styles.gameDescription}>
              Challenge your memory by matching pairs of cards. 
              Focus on this task to shift your mind away from stressors.
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      

    </View>
  );
};

// Game 1: Bubble Pop Game
const BubblePopGame = () => {
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds game
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const animationRef = useRef(null);
  
  // Start the game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setTimeLeft(60);
    setBubbles([]);
    setGameOver(false);
  };
  
  // Generate a random bubble
  const generateBubble = () => {
    const colors = ['#FF5722', '#FF9800', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50', '#009688', '#00BCD4', '#03A9F4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      id: Date.now().toString() + Math.random().toString(),
      x: Math.random() * (width - bubbleSize),
      y: Math.random() * (height - 250 - bubbleSize) + 150, // Avoid header area
      size: Math.random() * 30 + 40, // Size between 40-70
      color: randomColor,
    };
  };
  
  // Pop a bubble
  const popBubble = (id) => {
    setBubbles(currentBubbles => currentBubbles.filter(bubble => bubble.id !== id));
    setScore(prevScore => prevScore + 1);
  };
  
  // Game timer
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameActive) {
      setGameActive(false);
      setGameOver(true);
      clearInterval(timer);
    }
    
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);
  
  // Generate bubbles
  useEffect(() => {
    let interval;
    if (gameActive) {
      interval = setInterval(() => {
        if (bubbles.length < maxBubbles) {
          setBubbles(prevBubbles => [...prevBubbles, generateBubble()]);
        }
      }, 1000);
      
      // Animate bubbles
      const animate = () => {
        setBubbles(prevBubbles => 
          prevBubbles.map(bubble => ({
            ...bubble,
            y: bubble.y - 1, // Move up
          })).filter(bubble => bubble.y + bubble.size > 0) // Remove bubbles that go off screen
        );
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameActive, bubbles.length]);
  
  // Render game UI
  return (
    <View style={styles.gameContainer}>
      {!gameActive && !gameOver ? (
        <View style={styles.startScreen}>
          <Text style={styles.gameTitle}>Bubble Pop</Text>
          <Text style={styles.gameInstructions}>
            Pop as many bubbles as you can in 60 seconds to release stress!
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOverScreen}>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.gameOverScore}>Your Score: {score}</Text>
          <Text style={styles.gameOverMessage}>
            {score < 10 ? "Nice effort! Try again to beat your score." :
             score < 20 ? "Good job! You're getting better at focusing." :
             score < 30 ? "Excellent! Your coordination is impressive." :
             "Amazing! You're a bubble-popping champion!"}
          </Text>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={startGame}
          >
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.gameStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>{timeLeft}s</Text>
            </View>
          </View>
          
          <View style={styles.gamePlayArea}>
            {bubbles.map((bubble) => (
              <TouchableOpacity
                key={bubble.id}
                style={[
                  styles.bubble,
                  {
                    left: bubble.x,
                    top: bubble.y,
                    width: bubble.size,
                    height: bubble.size,
                    backgroundColor: bubble.color,
                  },
                ]}
                onPress={() => popBubble(bubble.id)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// Game 2: Memory Game
const MemoryGame = () => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  
  // Card emojis
  const cardEmojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍑', '🍋'];
  
  // Initialize game
  const startGame = () => {
    // Create pairs of cards with emojis
    const pairs = [...cardEmojis, ...cardEmojis];
    
    // Shuffle pairs
    const shuffled = pairs
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }, index) => ({ id: index, value, isFlipped: false, isMatched: false }));
    
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameStarted(true);
    setGameOver(false);
    setStartTime(new Date());
    setEndTime(null);
  };
  
  // Handle card flip
  const handleCardFlip = (id) => {
    // Skip if the same card is clicked or if two cards are already flipped
    if (flipped.includes(id) || flipped.length === 2) return;
    
    // Add card to flipped array
    setFlipped([...flipped, id]);
    
    // If this is the second card flipped
    if (flipped.length === 1) {
      setMoves(prevMoves => prevMoves + 1);
      
      const firstCardId = flipped[0];
      const secondCardId = id;
      
      // Check if cards match
      if (cards[firstCardId].value === cards[secondCardId].value) {
        // Match found!
        setMatched([...matched, firstCardId, secondCardId]);
        setFlipped([]);
        
        // Check if game is over (all cards matched)
        if (matched.length + 2 === cards.length) {
          setGameOver(true);
          setEndTime(new Date());
        }
      } else {
        // No match, reset flipped cards after a short delay
        setTimeout(() => {
          setFlipped([]);
        }, 1000);
      }
    }
  };
  
  // Calculate elapsed time in seconds
  const getElapsedTime = () => {
    if (!startTime || !endTime) return 0;
    return Math.floor((endTime - startTime) / 1000);
  };
  
  // Get a star rating based on moves
  const getStarRating = () => {
    const totalPairs = cardEmojis.length;
    if (moves <= totalPairs + 2) return "⭐⭐⭐"; // Perfect or near perfect
    if (moves <= totalPairs * 2) return "⭐⭐";   // Good
    return "⭐";                                  // Needs improvement
  };
  
  // Render the memory game UI
  return (
    <View style={styles.gameContainer}>
      {!gameStarted ? (
        <View style={styles.startScreen}>
          <Text style={styles.gameTitle}>Memory Match</Text>
          <Text style={styles.gameInstructions}>
            Find all matching pairs of cards. Train your memory and focus your mind!
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOverScreen}>
          <Text style={styles.gameOverTitle}>Congratulations!</Text>
          <Text style={styles.gameOverScore}>Moves: {moves}</Text>
          <Text style={styles.gameOverTime}>Time: {getElapsedTime()} seconds</Text>
          <Text style={styles.gameOverRating}>{getStarRating()}</Text>
          <Text style={styles.gameOverMessage}>
            {getStarRating() === "⭐⭐⭐" 
              ? "Amazing! Your memory is exceptional!" 
              : getStarRating() === "⭐⭐" 
                ? "Good job! Keep practicing to improve your memory."
                : "Nice try! Play again to enhance your memory skills."}
          </Text>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={startGame}
          >
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.gameStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Moves</Text>
              <Text style={styles.statValue}>{moves}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Matches</Text>
              <Text style={styles.statValue}>{matched.length / 2} / {cardEmojis.length}</Text>
            </View>
          </View>
          
          <View style={styles.memoryGameBoard}>
            {cards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.memoryCard,
                  (flipped.includes(index) || matched.includes(index)) && styles.memoryCardFlipped,
                  matched.includes(index) && styles.memoryCardMatched,
                ]}
                onPress={() => handleCardFlip(index)}
                disabled={flipped.includes(index) || matched.includes(index)}
              >
                {(flipped.includes(index) || matched.includes(index)) ? (
                  <Text style={styles.memoryCardText}>{card.value}</Text>
                ) : (
                  <Text style={styles.memoryCardBack}>?</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Game Selection styles
  gameSelectionContainer: {
    flex: 1,
    padding: 20,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  gameOption: {
    marginBottom: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  gameOptionGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  gameIcon: {
    fontSize: 30,
  },
  gameTextContainer: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  gamesTip: {
    fontSize: 14,
    color: '#666',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginTop: 10,
    lineHeight: 20,
  },
  
  // Common Game styles
  gameContainer: {
    flex: 1,
    padding: 20,
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameInstructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statItem: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    minWidth: 100,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  gameOverScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 15,
  },
  gameOverScore: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  gameOverTime: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  gameOverRating: {
    fontSize: 30,
    marginBottom: 15,
  },
  gameOverMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  playAgainButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Bubble Pop Game styles
  gamePlayArea: {
    flex: 1,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Memory Game styles
  memoryGameBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  memoryCard: {
    width: '22%', // For a 4x4 grid with some spacing
    aspectRatio: 1,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  memoryCardFlipped: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  memoryCardMatched: {
    backgroundColor: '#E6F4EA',
    borderColor: '#4CAF50',
  },
  memoryCardText: {
    fontSize: 24,
  },
  memoryCardBack: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default GamesScreen;