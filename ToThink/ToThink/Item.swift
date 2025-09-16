//
//  Item.swift
//  ToThink
//
//  Created by nafell on 2025/09/16.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
