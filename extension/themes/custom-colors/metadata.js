export default {
  "id": "custom-colors",
  "name": "Custom Colors",
  "description": "Customize YouTube's light and dark colors.",
  "version": "1.0",
  "authors": [
    "Antinity"
  ],
  "options": {
    "light": {
      "label": "Light palette",
      "type": "group",
      "options": {
        "color-background-light": {
          "type": "color",
          "label": "Background",
          "default": "#ffffff"
        },
        "color-foreground-light": {
          "type": "color",
          "label": "Foreground",
          "default": "#0f0f0f"
        },
        "color-accent-light": {
          "type": "color",
          "label": "Accent",
          "default": "#ff0000"
        },
        "color-blue-light": {
          "type": "color",
          "label": "Blue",
          "default": "#065fd4"
        },
        "color-green-light": {
          "type": "color",
          "label": "Green",
          "default": "#2ba640"
        },
        "color-yellow-light": {
          "type": "color",
          "label": "Yellow",
          "default": "#ffd600"
        }
      }
    },
    "dark": {
      "label": "Dark palette",
      "type": "group",
      "options": {
        "color-background-dark": {
          "type": "color",
          "label": "Background",
          "default": "#0f0f0f"
        },
        "color-foreground-dark": {
          "type": "color",
          "label": "Foreground",
          "default": "#f1f1f1"
        },
        "color-accent-dark": {
          "type": "color",
          "label": "Accent",
          "default": "#ff0000"
        },
        "color-blue-dark": {
          "type": "color",
          "label": "Blue",
          "default": "#3ea6ff"
        },
        "color-green-dark": {
          "type": "color",
          "label": "Green",
          "default": "#2ba640"
        },
        "color-yellow-dark": {
          "type": "color",
          "label": "Yellow",
          "default": "#ffd600"
        }
      }
    },
    "animations": {
      "type": "boolean",
      "label": "Animate search box changes",
      "default": false
    }
  }
};
