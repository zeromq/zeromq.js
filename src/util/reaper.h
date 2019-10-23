/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include <mutex>
#include <set>
#include <vector>

namespace zmq {
/* Default deleter for an object. Calls ->Close(). */
template <typename T>
struct Close {
    constexpr Close() noexcept = default;
    void operator()(T* ptr) {
        ptr->Close();
    }
};

/* Class that stores pointers and cleans them up at once during destruction. */
template <typename T, typename Deleter = Close<T>>
class Reaper {
    std::set<T*> pointers;

public:
    ~Reaper() {
        /* Copy pointers to vector to avoid issues with callbacks deregistering
           themselves from the reaper while we are still iterating. We iterate
           in reverse order, trying to close the most recently registered
           objects first. */
        std::vector<T*> objects(pointers.crbegin(), pointers.crend());
        for (auto obj : objects) {
            Deleter()(obj);
        }
    }

    inline void Add(T* ptr) {
        assert(ptr);
        pointers.insert(ptr);
    }

    inline void Remove(T* ptr) {
        assert(ptr);
        pointers.erase(ptr);
    }
};

/* Same as reaper but synchronizes add/remove operations. */
template <typename T, typename Deleter = Close<T>>
class ThreadSafeReaper : Reaper<T, Deleter> {
    std::mutex lock;

public:
    inline void Add(T* ptr) {
        std::lock_guard<std::mutex> guard(lock);
        Reaper<T, Deleter>::Add(ptr);
    }

    inline void Remove(T* ptr) {
        std::lock_guard<std::mutex> guard(lock);
        Reaper<T, Deleter>::Remove(ptr);
    }
};
}
