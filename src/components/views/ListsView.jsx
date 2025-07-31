import React, { useState, useContext } from 'react';
import { Calendar, Plus, Eye, AlertCircle, Trash2, Edit3 } from 'lucide-react';
import AppContext from '../../contexts/AppContext';
import { CreateListModal } from '../lists/CreateListModal';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { EditTaskModal } from '../tasks/EditTaskModal';
import { EditListModal } from '../lists/EditListModal';

export const ListsView = () => {
  const { data, updateData, createList, updateList, deleteList, loadTasksForList, createTask, updateTask, toggleTask, deleteTask } = useContext(AppContext);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingList, setEditingList] = useState(null);

  // CONTROLLO DI SICUREZZA per evitare errori con data.lists
  const lists = Array.isArray(data.lists) ? data.lists : [];
  const tasks = data.selectedList?.tasks || [];

  const handleSelectList = async (list) => {
    console.log('📋 Selecting list:', list.name);
    updateData({ selectedList: list });
    if (loadTasksForList) {
      await loadTasksForList(list.id);
    }
  };

  const handleCreateList = async (listData) => {
    console.log('📝 Creating new list:', listData);
    if (createList) {
      await createList(listData);
    }
    setShowCreateList(false);
  };

  const handleEditList = (list) => {
    console.log('✏️ Opening edit modal for list:', list.id);
    setEditingList(list);
  };

  const handleUpdateList = async (listData) => {
    if (editingList && updateList) {
      console.log('💾 Updating list:', editingList.id);
      await updateList(editingList.id, listData);
      setEditingList(null);
    }
  };

  const handleDeleteList = async (listId) => {
    const list = lists.find(l => l.id === listId);
    if (window.confirm(`Vuoi eliminare la lista "${list?.name}" e tutti i suoi task?`)) {
      console.log('🗑️ Deleting list:', listId);
      if (deleteList) {
        await deleteList(listId);
      }
    }
  };

  const handleCreateTask = async (taskData) => {
    if (data.selectedList && createTask) {
      console.log('📋 Creating task in list:', data.selectedList.id);
      await createTask(data.selectedList.id, taskData);
      setShowCreateTask(false);
    }
  };

  const handleEditTask = (task) => {
    console.log('✏️ Opening edit modal for task:', task.id);
    setEditingTask(task);
  };

  // ✅ FIX: updateTask con firma corretta (taskId, taskData)
  const handleUpdateTask = async (taskData) => {
    if (editingTask && updateTask) {
      console.log('💾 Updating task:', editingTask.id);
      // Assicurati che taskData includa listId per il reload
      const taskDataWithList = {
        ...taskData,
        listId: data.selectedList?.id
      };
      await updateTask(editingTask.id, taskDataWithList);
      setEditingTask(null);
    }
  };

  // ✅ FIX: toggleTask con firma corretta (taskId)
  const handleToggleTask = async (taskId) => {
    if (toggleTask) {
      console.log('✅ Toggling task:', taskId);
      await toggleTask(taskId);
    }
  };

  // ✅ FIX: deleteTask con firma corretta (taskId)
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Vuoi eliminare questo task?')) {
      if (deleteTask) {
        console.log('🗑️ Deleting task:', taskId);
        await deleteTask(taskId);
      }
    }
  };

  // Componente Task per rendering singolo task
  const TaskItem = ({ task }) => (
    <div className="bg-white p-4 rounded-lg border hover:shadow-sm transition-all group">
      <div className="flex items-start space-x-3">
        <button
          onClick={() => handleToggleTask(task.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-400'
          }`}
        >
          {task.completed && <span className="text-xs">✓</span>}
        </button>
        
        <div className="flex-1">
          <h4 className={`font-medium ${
            task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}>
            {task.title}
          </h4>
          {task.details && (
            <p className={`text-sm mt-1 ${
              task.completed ? 'text-gray-400 line-through' : 'text-gray-600'
            }`}>
              {task.details}
            </p>
          )}
          {task.reminder && (
            <p className={`text-xs mt-1 ${
              task.completed ? 'text-gray-400' : 'text-orange-600'
            }`}>
              📅 Scadenza: {new Date(task.reminder).toLocaleString('it-IT')}
            </p>
          )}
          {task.priority && (
            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
              task.priority === 'high' 
                ? 'bg-red-100 text-red-700'
                : task.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Bassa'}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEditTask(task)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Modifica task"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Elimina task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Lista delle liste */}
      <div className="w-80 bg-white border-r p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Le Tue Liste</h2>
          <button
            onClick={() => setShowCreateList(true)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Crea nuova lista"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {lists.map(list => (
            <div
              key={list.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all group ${
                data.selectedList?.id === list.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => handleSelectList(list)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{list.name}</h3>
                    <p className="text-sm text-gray-500">
                      {list.incompleteTasks || 0} attivi / {list.totalTasks || 0} totali
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditList(list);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Modifica lista"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Elimina lista"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {lists.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nessuna lista trovata.</p>
            <p className="text-sm mt-1">Crea la tua prima lista!</p>
          </div>
        )}
      </div>

      {/* Area dei task */}
      <div className="flex-1 p-6">
        {data.selectedList ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <div 
                    className="w-6 h-6 rounded-full mr-3"
                    style={{ backgroundColor: data.selectedList.color }}
                  />
                  {data.selectedList.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {tasks.filter(t => !t.completed).length} task attivi di {tasks.length} totali
                </p>
              </div>
              
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Nuovo Task
              </button>
            </div>

            {/* Lista task */}
            <div className="space-y-3">
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Nessun task in questa lista.</p>
                  <p className="text-sm mt-1">Crea il tuo primo task!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Eye size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Seleziona una lista per vedere i task</p>
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onSubmit={handleCreateList}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}

      {editingList && (
        <EditListModal
          list={editingList}
          onClose={() => setEditingList(null)}
          onSubmit={handleUpdateList}
        />
      )}
    </div>
  );
};