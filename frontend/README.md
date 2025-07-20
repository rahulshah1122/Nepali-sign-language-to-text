# Nepali Sign Language Recognition - Frontend

A modern, responsive React application for real-time Nepali sign language recognition using AI and computer vision.

## 🚀 Features

### Enhanced UI/UX
- **Modern Glassmorphism Design**: Beautiful glass-like cards with backdrop blur effects
- **Smooth Animations**: Powered by Framer Motion for fluid transitions and micro-interactions
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Real-time Feedback**: Live prediction updates with confidence scores
- **Progress Indicators**: Visual feedback for gesture stabilization
- **Statistics Dashboard**: Track predictions, accuracy, and learning progress

### Technical Features
- **Lenis Smooth Scrolling**: Buttery smooth scrolling experience
- **MediaPipe Integration**: Real-time hand landmark detection and visualization
- **Ant Design Components**: Professional UI components with custom theming
- **Gradient Effects**: Beautiful color gradients and visual effects
- **Accessibility**: WCAG compliant with focus states and reduced motion support

## 🎨 Design System

### Color Palette
- **Primary**: `#00b96b` (Green)
- **Secondary**: `#1890ff` (Blue)
- **Success**: `#52c41a` (Green)
- **Warning**: `#faad14` (Orange)
- **Error**: `#ff4d4f` (Red)

### Typography
- **Font Family**: System fonts with fallbacks
- **Font Sizes**: Responsive scaling
- **Line Heights**: Optimized for readability

### Animations
- **Entrance Animations**: Staggered card reveals
- **Hover Effects**: Subtle lift and glow effects
- **Loading States**: Smooth spinners and progress bars
- **Micro-interactions**: Button clicks and tag animations

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 📦 Dependencies

### Core
- `react`: ^19.1.0
- `react-dom`: ^19.1.0
- `antd`: ^5.26.5
- `framer-motion`: Latest

### UI/UX
- `@ant-design/icons`: ^6.0.0
- `@studio-freight/lenis`: ^1.0.42
- `react-icons`: Latest

### Computer Vision
- `@mediapipe/hands`: ^0.4.1675469240
- `@mediapipe/drawing_utils`: ^0.3.1675466124
- `react-webcam`: ^7.2.0

### Utilities
- `axios`: ^1.10.0

## 🎯 Usage

### Starting the Application
1. Ensure the backend server is running on `http://localhost:8000`
2. Start the frontend development server
3. Allow camera permissions when prompted
4. Position your hands within the detection area
5. Begin signing to see real-time predictions

### Features Overview
- **Live Camera Feed**: Real-time webcam with hand landmark overlay
- **Detection Zone**: Green overlay showing the optimal signing area
- **Current Prediction**: Live updates of detected gestures
- **Confirmed Words**: Words locked after 3 seconds of consistent prediction
- **Sentence Formation**: Build complete sentences from confirmed words
- **Statistics**: Track your learning progress and accuracy

## 🎨 Customization

### Theme Configuration
Edit `src/theme.js` to customize:
- Color palette
- Border radius
- Font settings
- Component-specific styling

### CSS Customization
Modify `src/App.css` for:
- Animation timings
- Glassmorphism effects
- Responsive breakpoints
- Accessibility features

## 📱 Responsive Design

### Breakpoints
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

### Mobile Optimizations
- Touch-friendly buttons
- Optimized detection zone
- Simplified layout for small screens
- Reduced animations for performance

## ♿ Accessibility

### Features
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Focus Management**: Visible focus indicators
- **Reduced Motion**: Respects user preferences
- **High Contrast**: Support for high contrast mode
- **Color Blindness**: Color-safe design choices

## 🔧 Development

### Project Structure
```
src/
├── App.js              # Main application component
├── App.css             # Global styles and animations
├── theme.js            # Ant Design theme configuration
├── index.js            # Application entry point
└── components/         # Reusable components (future)
```

### Key Components
- **App**: Main application with layout and state management
- **WebcamFeed**: Camera integration with MediaPipe
- **PredictionPanel**: Real-time prediction display
- **Statistics**: Learning progress tracking
- **Controls**: Start/stop/reset functionality

## 🚀 Performance

### Optimizations
- **Lazy Loading**: Components load on demand
- **Memoization**: React.memo for expensive components
- **Debounced Updates**: Smooth prediction updates
- **Canvas Optimization**: Efficient hand landmark rendering
- **Image Compression**: Optimized webcam capture

### Best Practices
- **Code Splitting**: Route-based code splitting
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: Browser caching for static assets
- **CDN**: Fast content delivery

## 🐛 Troubleshooting

### Common Issues
1. **Camera Not Working**: Check browser permissions
2. **Predictions Not Loading**: Verify backend server is running
3. **Performance Issues**: Reduce webcam resolution or disable animations
4. **Mobile Issues**: Ensure HTTPS for camera access

### Debug Mode
Enable debug logging by setting `localStorage.debug = 'true'` in browser console.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

---

**Built with ❤️ using React, Ant Design, and Framer Motion** 