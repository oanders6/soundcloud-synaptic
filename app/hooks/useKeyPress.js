import { useState, useEffect } from "react";

export function useKeyPress(targetKey, handler) {
  // State for keeping track of whether key is pressed
  const [keyPressed, setKeyPressed] = useState(false);

  // Add event listeners
  useEffect(() => {
    // If pressed key is our target key then set to true
    const downHandler = (event) => {
      if (event.key === targetKey) {
        setKeyPressed(true);
        handler();
        event.preventDefault();
      }
    };

    // If released key is our target key then set to false
    const upHandler = (event) => {
      if (event.key === targetKey) {
        setKeyPressed(false);
        event.preventDefault();
      }
    };

    // Add event listeners
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [targetKey, handler]); // Only re-run if key or handler changes

  return keyPressed;
}
