"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var accManager;
var isListening = false;
var main_queue = dispatch_get_current_queue();
function getNativeDelay(options) {
    if (!options || !options.sensorDelay) {
        return 0.2;
    }
    switch (options.sensorDelay) {
        case "normal":
            return 0.2;
        case "ui":
            return 0.06;
        case "game":
            return 0.02;
        case "fastest":
            return 0.001;
    }
}
function startAccelerometerUpdates(callback, options) {
    if (isListening) {
        throw new Error("Already listening for accelerometer updates.");
    }
    var wrappedCallback = zonedCallback(callback);
    if (!accManager) {
        accManager = CMMotionManager.alloc().init();
    }
    accManager.accelerometerUpdateInterval = getNativeDelay(options);
    if (accManager.accelerometerAvailable) {
        var queue = NSOperationQueue.alloc().init();
        accManager.startAccelerometerUpdatesToQueueWithHandler(queue, function (data, error) {
            dispatch_async(main_queue, function () {
                wrappedCallback({
                    x: data.acceleration.x,
                    y: data.acceleration.y,
                    z: data.acceleration.z
                });
            });
        });
        isListening = true;
    }
    else {
        throw new Error("Accelerometer not available.");
    }
}
exports.startAccelerometerUpdates = startAccelerometerUpdates;
function stopAccelerometerUpdates() {
    if (!isListening) {
        throw new Error("Currently not listening for acceleration events.");
    }
    accManager.stopAccelerometerUpdates();
    isListening = false;
}
exports.stopAccelerometerUpdates = stopAccelerometerUpdates;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguaW9zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW5kZXguaW9zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBSUEsSUFBSSxVQUFVLENBQUM7QUFDZixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7QUFDeEIsSUFBSSxVQUFVLEdBQUcsMEJBQTBCLEVBQUUsQ0FBQztBQUU5Qyx3QkFBd0IsT0FBOEI7SUFDbEQsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7UUFDbEMsT0FBTyxHQUFHLENBQUM7S0FDZDtJQUVELFFBQVEsT0FBTyxDQUFDLFdBQVcsRUFBRTtRQUN6QixLQUFLLFFBQVE7WUFDVCxPQUFPLEdBQUcsQ0FBQztRQUNmLEtBQUssSUFBSTtZQUNMLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLEtBQUssTUFBTTtZQUNQLE9BQU8sSUFBSSxDQUFBO1FBQ2YsS0FBSyxTQUFTO1lBQ1YsT0FBTyxLQUFLLENBQUM7S0FDcEI7QUFDTCxDQUFDO0FBRUQsbUNBQTBDLFFBQXFDLEVBQUUsT0FBOEI7SUFDM0csSUFBSSxXQUFXLEVBQUU7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUE7S0FDbEU7SUFFRCxJQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFaEQsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNiLFVBQVUsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDL0M7SUFFRCxVQUFVLENBQUMsMkJBQTJCLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWpFLElBQUksVUFBVSxDQUFDLHNCQUFzQixFQUFFO1FBQ25DLElBQUksS0FBSyxHQUFHLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzVDLFVBQVUsQ0FBQywyQ0FBMkMsQ0FBQyxLQUFLLEVBQUUsVUFBQyxJQUFJLEVBQUUsS0FBSztZQUN0RSxjQUFjLENBQUMsVUFBVSxFQUFFO2dCQUN2QixlQUFlLENBQUM7b0JBQ1osQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDdEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDdEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztpQkFDekIsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQztRQUVILFdBQVcsR0FBRyxJQUFJLENBQUM7S0FDdEI7U0FBTTtRQUNILE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQTtLQUNsRDtBQUNMLENBQUM7QUE3QkQsOERBNkJDO0FBRUQ7SUFDSSxJQUFJLENBQUMsV0FBVyxFQUFFO1FBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFBO0tBQ3RFO0lBRUQsVUFBVSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDdEMsV0FBVyxHQUFHLEtBQUssQ0FBQztBQUN4QixDQUFDO0FBUEQsNERBT0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9ub2RlX21vZHVsZXMvdG5zLXBsYXRmb3JtLWRlY2xhcmF0aW9ucy9pb3MuZC50c1wiIC8+IE5lZWRlZCBmb3IgYXV0b2NvbXBsZXRpb24gYW5kIGNvbXBpbGF0aW9uLlxyXG5cclxuaW1wb3J0IHsgU2Vuc29yRGVsYXksIEFjY2VsZXJvbWV0ZXJPcHRpb25zLCBBY2NlbGVyb21ldGVyRGF0YSB9IGZyb20gXCIuXCI7XHJcblxyXG5sZXQgYWNjTWFuYWdlcjtcclxubGV0IGlzTGlzdGVuaW5nID0gZmFsc2U7XHJcbmxldCBtYWluX3F1ZXVlID0gZGlzcGF0Y2hfZ2V0X2N1cnJlbnRfcXVldWUoKTtcclxuXHJcbmZ1bmN0aW9uIGdldE5hdGl2ZURlbGF5KG9wdGlvbnM/OiBBY2NlbGVyb21ldGVyT3B0aW9ucyk6IG51bWJlciB7XHJcbiAgICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuc2Vuc29yRGVsYXkpIHtcclxuICAgICAgICByZXR1cm4gMC4yO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAob3B0aW9ucy5zZW5zb3JEZWxheSkge1xyXG4gICAgICAgIGNhc2UgXCJub3JtYWxcIjpcclxuICAgICAgICAgICAgcmV0dXJuIDAuMjtcclxuICAgICAgICBjYXNlIFwidWlcIjpcclxuICAgICAgICAgICAgcmV0dXJuIDAuMDY7XHJcbiAgICAgICAgY2FzZSBcImdhbWVcIjpcclxuICAgICAgICAgICAgcmV0dXJuIDAuMDJcclxuICAgICAgICBjYXNlIFwiZmFzdGVzdFwiOlxyXG4gICAgICAgICAgICByZXR1cm4gMC4wMDE7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdGFydEFjY2VsZXJvbWV0ZXJVcGRhdGVzKGNhbGxiYWNrOiAoQWNjZWxlcm9tZXRlckRhdGEpID0+IHZvaWQsIG9wdGlvbnM/OiBBY2NlbGVyb21ldGVyT3B0aW9ucykge1xyXG4gICAgaWYgKGlzTGlzdGVuaW5nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWxyZWFkeSBsaXN0ZW5pbmcgZm9yIGFjY2VsZXJvbWV0ZXIgdXBkYXRlcy5cIilcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB6b25lZENhbGxiYWNrKGNhbGxiYWNrKTtcclxuXHJcbiAgICBpZiAoIWFjY01hbmFnZXIpIHtcclxuICAgICAgICBhY2NNYW5hZ2VyID0gQ01Nb3Rpb25NYW5hZ2VyLmFsbG9jKCkuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGFjY01hbmFnZXIuYWNjZWxlcm9tZXRlclVwZGF0ZUludGVydmFsID0gZ2V0TmF0aXZlRGVsYXkob3B0aW9ucyk7XHJcblxyXG4gICAgaWYgKGFjY01hbmFnZXIuYWNjZWxlcm9tZXRlckF2YWlsYWJsZSkge1xyXG4gICAgICAgIHZhciBxdWV1ZSA9IE5TT3BlcmF0aW9uUXVldWUuYWxsb2MoKS5pbml0KCk7XHJcbiAgICAgICAgYWNjTWFuYWdlci5zdGFydEFjY2VsZXJvbWV0ZXJVcGRhdGVzVG9RdWV1ZVdpdGhIYW5kbGVyKHF1ZXVlLCAoZGF0YSwgZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgZGlzcGF0Y2hfYXN5bmMobWFpbl9xdWV1ZSwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgd3JhcHBlZENhbGxiYWNrKHtcclxuICAgICAgICAgICAgICAgICAgICB4OiBkYXRhLmFjY2VsZXJhdGlvbi54LFxyXG4gICAgICAgICAgICAgICAgICAgIHk6IGRhdGEuYWNjZWxlcmF0aW9uLnksXHJcbiAgICAgICAgICAgICAgICAgICAgejogZGF0YS5hY2NlbGVyYXRpb24uelxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaXNMaXN0ZW5pbmcgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBY2NlbGVyb21ldGVyIG5vdCBhdmFpbGFibGUuXCIpXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzdG9wQWNjZWxlcm9tZXRlclVwZGF0ZXMoKSB7XHJcbiAgICBpZiAoIWlzTGlzdGVuaW5nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ3VycmVudGx5IG5vdCBsaXN0ZW5pbmcgZm9yIGFjY2VsZXJhdGlvbiBldmVudHMuXCIpXHJcbiAgICB9XHJcblxyXG4gICAgYWNjTWFuYWdlci5zdG9wQWNjZWxlcm9tZXRlclVwZGF0ZXMoKTtcclxuICAgIGlzTGlzdGVuaW5nID0gZmFsc2U7XHJcbn1cclxuIl19