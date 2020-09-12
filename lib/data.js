const { promises: fsPromises } = require("fs");
const path = require("path");

const _data = {};

// Base directory of data folder
_data.baseDir = path.join(__dirname, "/../.data/");

_data.create = async (dir, file, data) => {
  let fileHandle;
  console.log(_data.baseDir + dir + "/" + file + ".json");
  try {
    fileHandle = await fsPromises.open(
      _data.baseDir + dir + "/" + file + ".json",
      "wx"
    );
    await fileHandle.writeFile(JSON.stringify(data));
  } finally {
    if (fileHandle) await fileHandle.close();
  }
};

_data.read = async (dir, file) => {
  let fileHandle;
  try {
    fileHandle = await fsPromises.open(
      _data.baseDir + dir + "/" + file + ".json",
      "r"
    );
    data = await fileHandle.readFile("utf8");
    return JSON.parse(data);
  } finally {
    if (fileHandle) await fileHandle.close();
  }
};

_data.update = async (dir, file, data) => {
  let fileHandle;

  try {
    fileHandle = await fsPromises.open(
      _data.baseDir + dir + "/" + file + ".json",
      "r+"
    );
    await fileHandle.truncate();
    await fileHandle.writeFile(JSON.stringify(data));
  } finally {
    if (fileHandle) await fileHandle.close();
  }
};

_data.delete = async (dir, file) => {
  await fsPromises.unlink(_data.baseDir + dir + "/" + file + ".json");
};

_data.list = async (dir) => {
  let dirList = await fsPromises.readdir(_data.baseDir + dir + "/");
  return dirList.map((dir) => dir.replace(".json", ""));
};

// Export the module
module.exports = _data;
