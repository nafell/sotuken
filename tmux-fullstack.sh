cd ~/sotuken
tmux new-session -d -s fullstack
tmux split-window -h
tmux select-pane -t 0
tmux send-keys "cd server" C-m
tmux send-keys "bun run dev" C-m
tmux select-pane -t 1
tmux send-keys "cd concern-app" C-m
tmux send-keys "bun run dev" C-m
tmux attach-session -t fullstack