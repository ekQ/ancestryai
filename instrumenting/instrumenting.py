
import time

class Timer:
    def __init__(self, verbose=False, messagelen=20):
        now = time.time()
        self.times = [(now, now, "", [])]
        self.subtimes = []
        self.verbose = verbose
        self.messagelen = messagelen
    def duration_ms(self, entry):
        return int((entry[1] - entry[0]) * 1000)
    def print_message(self, message, time_ms, is_submeasure=False):
        print "{{:{}}} {{}}{{:8}}ms".format(self.messagelen).format(message, "    " if is_submeasure else "", time_ms)
    def measure(self, message):
        if len(message) > self.messagelen:
            self.messagelen = len(message) + 10
        now = time.time()
        self.times.append((self.times[-1][1], now, message, self.subtimes))
        self.subtimes = []
        if self.verbose:
            self.print_message(message, self.duration_ms(self.times[-1]), False)
    def submeasure(self, message):
        message = "    " + message
        if len(message) > self.messagelen:
            self.messagelen = len(message) + 10
        now = time.time()
        if self.subtimes:
            self.subtimes.append((self.subtimes[-1][1], now, message))
        else:
            self.subtimes.append((self.times[-1][1], now, message))
        if self.verbose:
            if len(self.subtimes) == 1:
                print
            self.print_message(message, self.duration_ms(self.subtimes[-1]), True)
    def print_all(self):
        for t in self.times[1:]:
            begin, end, message, subtimes = t
            self.print_message(message, self.duration_ms(t), False)
            for st in subtimes:
                sbegin, send, smessage = st
                self.print_message(message, self.duration_ms(st), True)
    def full_duration(self):
        return self.times[-1][1] - self.times[0][0]
    def print_total(self):
        print "in total: {}ms".format(int(self.full_duration() * 1000))
