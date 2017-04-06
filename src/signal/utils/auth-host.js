import {trigger} from '../utils/subs';
import sockets from '../utils/sockets';

export default (socket, ownerId, name, key) => {
  const id = `${ownerId}-${name}`;
  if (socket.host && socket.host.name === id) return;
  if (sockets.hosts[id]) throw new Error(`Host ${id} is already online`);

  socket.host = {id, key, ownerId, name};
  console.log(`${socket.id} signed in as host ${id}`);
  sockets.hosts[id] = socket;
  trigger('host-added');
};
