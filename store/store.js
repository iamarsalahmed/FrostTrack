import { configureStore,createSlice } from '@reduxjs/toolkit';
const initialState={compartments:[],alerts:[],orders:[],history:[],serverTime:null,connected:false};
const monitorSlice=createSlice({name:'monitor',initialState,reducers:{snapshotReceived:(state,action)=>{Object.assign(state,action.payload);state.connected=true;},resetMonitor:()=>initialState}});
export const {snapshotReceived,resetMonitor}=monitorSlice.actions;
export const store=configureStore({reducer:{monitor:monitorSlice.reducer}});
