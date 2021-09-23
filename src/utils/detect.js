function dataTransferConstructor() {
  try {
    new DataTransfer();
    return true;
  } catch (err) {}

  return true;
}

export {dataTransferConstructor};
