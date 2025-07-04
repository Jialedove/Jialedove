keyboard$.subscribe(function(key) {
  if (key.mode === "search" && key.type === "x") {
    /* Add custom keyboard handler here */
    key.claim() 
  }
})