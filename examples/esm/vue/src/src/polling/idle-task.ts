/**
 * 定义空闲回调的截止时间接口
 */
interface IdleDeadline {
    didTimeout: boolean;
    timeRemaining: () => number;
}

/**
 * 定义空闲回调选项接口
 * @param timeout 指定空闲回调的最大等待时间（毫秒）, 确保即使浏览器一直处于忙碌状态，回调函数也会在指定时间后执行
 * timeout 值不应该设置得太小，否则可能导致任务执行不完整
 * timeout 值也不应该设置得太大，否则可能影响用户体验
 */
interface IdleRequestOptions {
    timeout?: number;
    onError?: (error: Error) => void;
}

/**
 * 定义空闲回调函数类型
 */
type IdleCallback = (deadline: IdleDeadline) => void;

/**
 * 定义任务队列类型
 */
type Task = () => void;

/**
 * 定义任务状态枚举
 */
enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

/**
 * 定义任务项接口
 */
interface TaskItem {
    task: Task;
    status: TaskStatus;
    error?: Error;
}

/**
 * 检查浏览器是否支持 requestIdleCallback
 */
const isRequestIdleCallbackSupported = (): boolean => {
    return 'requestIdleCallback' in window;
};

export class IdleTaskQueue {
    private tasks: TaskItem[] = [];
    private idleCallbackId: number | null = null;
    private options: IdleRequestOptions = {};

    /**
     * 创建 IdleTaskQueue 实例
     * @param initialTasks - 初始任务列表
     * @param options - 初始配置选项
     */
    constructor(initialTasks: Task[] = [], options: IdleRequestOptions = {}) {
        this.options = options;
        
        // 添加初始任务
        if (initialTasks.length > 0) {
            this.addTasks(initialTasks);
        }
    }

    /**
     * 添加任务到空闲队列
     * 
     * @param task - 要执行的任务
     * @param options - 配置选项
     * @returns 取消任务的函数
     */
    public addTask(task: Task, options: IdleRequestOptions = {}): () => void {
        this.options = { ...this.options, ...options };
        const taskItem: TaskItem = { task, status: TaskStatus.PENDING };
        this.tasks.push(taskItem);
        this.scheduleIdleCallback();
        
        // 返回取消函数
        return () => {
            const index = this.tasks.findIndex(item => item.task === task);
            if (index !== -1) {
                this.tasks.splice(index, 1);
                // 如果队列为空，取消空闲回调
                if (this.tasks.length === 0 && this.idleCallbackId !== null) {
                    this.cancelIdleCallback();
                }
            }
        };
    }

    /**
     * 批量添加任务到空闲队列
     * 
     * @param tasks - 要执行的任务数组
     * @param options - 配置选项
     * @returns 取消所有任务的函数
     */
    public addTasks(tasks: Task[], options: IdleRequestOptions = {}): () => void {
        this.options = { ...this.options, ...options };
        const taskItems: TaskItem[] = tasks.map(task => ({ task, status: TaskStatus.PENDING }));
        this.tasks.push(...taskItems);
        this.scheduleIdleCallback();
        
        // 返回取消函数
        return () => {
            this.tasks = this.tasks.filter(item => !tasks.includes(item.task));
            // 如果队列为空，取消空闲回调
            if (this.tasks.length === 0 && this.idleCallbackId !== null) {
                this.cancelIdleCallback();
            }
        };
    }

    /**
     * 调度空闲回调
     */
    private scheduleIdleCallback(): void {
        if (this.idleCallbackId !== null) {
            return; // 已经调度了空闲回调
        }

        if (isRequestIdleCallbackSupported()) {
            this.idleCallbackId = window.requestIdleCallback(this.processTasks, { 
                timeout: this.options.timeout || 2000 
            });
        } else {
            // 降级方案
            setTimeout(() => this.processTasks({ 
                timeRemaining: () => 0, 
                didTimeout: true 
            }), 0);
        }
    }

    /**
     * 取消空闲回调
     */
    private cancelIdleCallback(): void {
        if (this.idleCallbackId !== null && isRequestIdleCallbackSupported()) {
            window.cancelIdleCallback(this.idleCallbackId);
            this.idleCallbackId = null;
        }
    }

    /**
     * 处理任务队列
     */
    private processTasks = (deadline: IdleDeadline): void => {
        this.idleCallbackId = null;
        
        // 获取待处理的任务
        const pendingTasks = this.tasks.filter(item => item.status === TaskStatus.PENDING);
        
        if (pendingTasks.length === 0) {
            return;
        }

        // 处理任务
        while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && pendingTasks.length > 0) {
            const taskItem = pendingTasks.shift();
            if (taskItem) {
                try {
                    taskItem.status = TaskStatus.RUNNING;
                    taskItem.task();
                    taskItem.status = TaskStatus.COMPLETED;
                } catch (error) {
                    taskItem.status = TaskStatus.FAILED;
                    taskItem.error = error instanceof Error ? error : new Error(String(error));
                    console.error('Error executing idle task:', taskItem.error);
                    this.options.onError?.(taskItem.error);
                }
            }
        }

        // 如果还有待处理的任务，继续调度
        if (this.tasks.some(item => item.status === TaskStatus.PENDING)) {
            this.scheduleIdleCallback();
        }
    };

    /**
     * 清空任务队列
     */
    public clear(): void {
        this.cancelIdleCallback();
        this.tasks = [];
    }

    /**
     * 获取任务队列大小
     */
    public get size(): number {
        return this.tasks.length;
    }

    /**
     * 检查任务队列是否为空
     */
    public get isEmpty(): boolean {
        return this.tasks.length === 0;
    }

    /**
     * 获取任务列表
     */
    public get tasksList(): TaskItem[] {
        return [...this.tasks];
    }

    /**
     * 获取待处理任务数量
     */
    public get pendingCount(): number {
        return this.tasks.filter(item => item.status === TaskStatus.PENDING).length;
    }

    /**
     * 获取已完成任务数量
     */
    public get completedCount(): number {
        return this.tasks.filter(item => item.status === TaskStatus.COMPLETED).length;
    }

    /**
     * 获取失败任务数量
     */
    public get failedCount(): number {
        return this.tasks.filter(item => item.status === TaskStatus.FAILED).length;
    }
}